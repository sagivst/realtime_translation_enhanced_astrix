const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const axios = require('axios');
const net = require('net');

// Helper function to get process stats for any PID
async function getProcessStats(pid) {
    try {
        // Get CPU, Memory, and elapsed time for a PID
        const { stdout } = await execAsync(`ps -p ${pid} -o pid,%cpu,%mem,etime,rss,vsz,comm --no-headers 2>/dev/null`);
        if (!stdout.trim()) return null;
        
        const parts = stdout.trim().split(/\s+/);
        return {
            pid: parts[0],
            cpu_percent: parseFloat(parts[1]) || 0,
            mem_percent: parseFloat(parts[2]) || 0,
            uptime: parts[3] || 'unknown',
            rss_kb: parseInt(parts[4]) || 0,
            vsz_kb: parseInt(parts[5]) || 0,
            memory_mb: Math.round((parseInt(parts[4]) || 0) / 1024),
            command: parts.slice(6).join(' ')
        };
    } catch (error) {
        return null;
    }
}

// Helper to format uptime from etime format (DD-HH:MM:SS or HH:MM:SS or MM:SS)
function formatUptime(etime) {
    if (!etime || etime === 'unknown') return 'unknown';
    
    const parts = etime.split('-');
    let days = 0;
    let timePart = etime;
    
    if (parts.length === 2) {
        days = parseInt(parts[0]);
        timePart = parts[1];
    }
    
    const timeParts = timePart.split(':');
    let hours = 0, minutes = 0, seconds = 0;
    
    if (timeParts.length === 3) {
        hours = parseInt(timeParts[0]);
        minutes = parseInt(timeParts[1]);
        seconds = parseInt(timeParts[2]);
    } else if (timeParts.length === 2) {
        minutes = parseInt(timeParts[0]);
        seconds = parseInt(timeParts[1]);
    }
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
}

// Enhanced UDP socket checker with meaningful metrics
async function checkUDPSocket(port, description) {
    try {
        // Check if port is bound
        const { stdout: ssOutput } = await execAsync(`ss -lun | grep :${port} || true`);
        const isBound = ssOutput.includes(`:${port}`);
        
        // Check if STTTSserver (owner process) is running and get its stats
        const { stdout: sttPid } = await execAsync('pgrep -if STTTSserver || true');
        const ownerPid = sttPid.trim().split('\n')[0];
        const ownerRunning = ownerPid !== '';
        
        let ownerStats = null;
        if (ownerPid) {
            ownerStats = await getProcessStats(ownerPid);
        }
        
        // Get packet statistics
        const { stdout: netstatOutput } = await execAsync(`netstat -anu | grep :${port} || true`);
        
        // Extract queue sizes if available
        let recvQ = 0, sendQ = 0;
        if (netstatOutput) {
            const lines = netstatOutput.split('\n').filter(l => l.includes(`:${port}`));
            if (lines.length > 0) {
                const parts = lines[0].split(/\s+/);
                recvQ = parseInt(parts[1]) || 0;
                sendQ = parseInt(parts[2]) || 0;
            }
        }
        
        // Determine status based on multiple factors
        let status = 'NOT_BOUND';
        let statusDetail = '';
        
        if (!ownerRunning) {
            status = 'OWNER_DOWN';
            statusDetail = 'STTTSserver not running';
        } else if (!isBound) {
            status = 'NOT_BOUND';
            statusDetail = 'Port not bound';
        } else {
            status = 'READY';
            statusDetail = 'Socket bound and ready';
            if (recvQ > 0 || sendQ > 0) {
                status = 'ACTIVE';
                statusDetail = 'Processing traffic';
            }
        }
        
        return {
            status,
            statusDetail,
            pid: ownerPid || null,
            cpu: ownerStats?.cpu_percent || 0,
            memory: ownerStats?.memory_mb || 0,
            uptime: formatUptime(ownerStats?.uptime),
            metrics: {
                port,
                description,
                is_bound: isBound,
                owner_process_running: ownerRunning,
                owner_pid: ownerPid || null,
                owner_cpu_percent: ownerStats?.cpu_percent || 0,
                owner_memory_mb: ownerStats?.memory_mb || 0,
                receive_queue: recvQ,
                send_queue: sendQ
            }
        };
    } catch (error) {
        return {
            status: 'ERROR',
            statusDetail: error.message,
            metrics: { port, error: error.message }
        };
    }
}

// Enhanced Asterisk checker with process stats
async function checkAsteriskCore() {
    try {
        // Check main asterisk process
        const { stdout: asteriskPid } = await execAsync('pgrep -x asterisk || true');
        const pid = asteriskPid.trim().split('\n')[0];
        const isRunning = pid !== '';
        
        if (!isRunning) {
            return { 
                status: 'DEAD', 
                metrics: { 
                    process_running: false,
                    message: 'Asterisk process not found'
                } 
            };
        }
        
        // Get process stats
        const stats = await getProcessStats(pid);
        
        // Try to get additional info via asterisk CLI
        let activeChannels = 0;
        let activeCalls = 0;
        try {
            const { stdout: channelInfo } = await execAsync('timeout 2 asterisk -rx "core show channels" 2>/dev/null || true');
            const channelMatch = channelInfo.match(/([0-9]+) active channel/);
            const callMatch = channelInfo.match(/([0-9]+) active call/);
            activeChannels = channelMatch ? parseInt(channelMatch[1]) : 0;
            activeCalls = callMatch ? parseInt(callMatch[1]) : 0;
        } catch {
            // CLI unavailable, continue with basic stats
        }
        
        return {
            status: 'LIVE',
            pid: pid,
            cpu: stats?.cpu_percent || 0,
            memory: stats?.memory_mb || 0,
            uptime: formatUptime(stats?.uptime),
            port: 5060, // SIP port
            metrics: {
                process_running: true,
                pid: pid,
                cpu_percent: stats?.cpu_percent || 0,
                memory_mb: stats?.memory_mb || 0,
                active_channels: activeChannels,
                active_calls: activeCalls,
                message: `Asterisk running (${activeChannels} channels, ${activeCalls} calls)`
            }
        };
    } catch (error) {
        return {
            status: 'ERROR',
            metrics: { error: error.message }
        };
    }
}

// Enhanced PostgreSQL checker with process stats
async function checkPostgreSQL() {
    try {
        // Check if postgres process is running
        const { stdout: pgPid } = await execAsync('pgrep -if "postgres.*-D" || pgrep postgres || true');
        const pids = pgPid.trim().split('\n').filter(p => p);
        const mainPid = pids[0];
        const isRunning = mainPid !== '';
        
        if (!isRunning) {
            return {
                status: 'DEAD',
                metrics: {
                    process_running: false,
                    message: 'PostgreSQL process not found'
                }
            };
        }
        
        // Get process stats for main postgres process
        const stats = await getProcessStats(mainPid);
        
        // Check if it's accepting connections on default port
        const { stdout: pgPort } = await execAsync('ss -ltn | grep :5432 || true');
        const isListening = pgPort.includes(':5432');
        
        // Try to get connection count
        let connectionCount = 0;
        try {
            const { stdout: connInfo } = await execAsync(`ss -tn state established '( dport = :5432 or sport = :5432 )' | wc -l`);
            connectionCount = parseInt(connInfo.trim()) - 1; // Subtract header line
        } catch {
            // Continue without connection count
        }
        
        return {
            status: isListening ? 'LIVE' : 'DEGRADED',
            pid: mainPid,
            cpu: stats?.cpu_percent || 0,
            memory: stats?.memory_mb || 0,
            uptime: formatUptime(stats?.uptime),
            port: 5432,
            metrics: {
                process_running: true,
                pid: mainPid,
                cpu_percent: stats?.cpu_percent || 0,
                memory_mb: stats?.memory_mb || 0,
                process_count: pids.length,
                listening_on_5432: isListening,
                active_connections: connectionCount,
                message: isListening ? `PostgreSQL accepting connections (${connectionCount} active)` : 'PostgreSQL running but not listening on 5432'
            }
        };
    } catch (error) {
        return {
            status: 'ERROR',
            metrics: { error: error.message }
        };
    }
}

// Enhanced port listener checker (for AMI, ARI)
async function checkPortListener(port) {
    try {
        const { stdout } = await execAsync(`lsof -i:${port} -sTCP:LISTEN 2>/dev/null || true`);
        const isListening = stdout.trim() !== '';
        
        let pid = null;
        let processName = '';
        let stats = null;
        
        if (isListening && stdout) {
            // Extract PID from lsof output
            const lines = stdout.trim().split('\n');
            if (lines.length > 1) {
                const parts = lines[1].split(/\s+/);
                processName = parts[0];
                pid = parts[1];
                
                if (pid) {
                    stats = await getProcessStats(pid);
                }
            }
        }
        
        return {
            status: isListening ? 'LIVE' : 'DEAD',
            pid: pid,
            cpu: stats?.cpu_percent || 0,
            memory: stats?.memory_mb || 0,
            uptime: formatUptime(stats?.uptime),
            port: port,
            metrics: {
                port,
                listening: isListening,
                process: processName,
                pid: pid,
                cpu_percent: stats?.cpu_percent || 0,
                memory_mb: stats?.memory_mb || 0
            }
        };
    } catch (error) {
        return {
            status: 'ERROR',
            metrics: { port, error: error.message }
        };
    }
}

// Keep existing API checkers but add response time tracking
async function checkDeepgramAPI() {
    try {
        const apiKey = process.env.DEEPGRAM_API_KEY || '806ac77eb08d83390c265228dd2cc89c0b86f23e';
        const startTime = Date.now();
        const response = await axios.get('https://api.deepgram.com/v1/projects', {
            headers: { 'Authorization': `Token ${apiKey}` },
            timeout: 5000
        });
        const responseTime = Date.now() - startTime;
        
        return {
            status: 'HEALTHY',
            responseTime: `${responseTime}ms`,
            metrics: {
                response_time_ms: responseTime,
                status_code: response.status,
                error_rate: 0,
                endpoint: 'api.deepgram.com'
            }
        };
    } catch (error) {
        return {
            status: error.response?.status === 401 ? 'AUTH_ERROR' : 'DEGRADED',
            responseTime: 'timeout',
            metrics: {
                error: error.message,
                status_code: error.response?.status || 0,
                error_rate: 1,
                endpoint: 'api.deepgram.com'
            }
        };
    }
}

async function checkDeepLAPI() {
    try {
        const apiKey = process.env.DEEPL_API_KEY || 'd7ec78e4-8fbb-4a34-b265-becea2b269ad';
        const startTime = Date.now();
        const response = await axios.get('https://api.deepl.com/v2/usage', {
            headers: { 'Authorization': `DeepL-Auth-Key ${apiKey}` },
            timeout: 5000
        });
        const responseTime = Date.now() - startTime;
        
        return {
            status: 'HEALTHY',
            responseTime: `${responseTime}ms`,
            usage: `${response.data?.character_count || 0}/${response.data?.character_limit || 0}`,
            metrics: {
                response_time_ms: responseTime,
                status_code: response.status,
                character_count: response.data?.character_count || 0,
                character_limit: response.data?.character_limit || 0,
                error_rate: 0,
                endpoint: 'api.deepl.com'
            }
        };
    } catch (error) {
        return {
            status: error.response?.status === 403 ? 'AUTH_ERROR' : 'DEGRADED',
            responseTime: 'timeout',
            metrics: {
                error: error.message,
                status_code: error.response?.status || 0,
                error_rate: 1,
                endpoint: 'api.deepl.com'
            }
        };
    }
}

async function checkElevenLabsAPI() {
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY || 'sk_968d6d3e5b92cfce648ce9a38478ee131d98750ef4e09f05';
        const startTime = Date.now();
        const response = await axios.get('https://api.elevenlabs.io/v1/user', {
            headers: { 'xi-api-key': apiKey },
            timeout: 5000
        });
        const responseTime = Date.now() - startTime;
        
        const charCount = response.data?.subscription?.character_count || 0;
        const charLimit = response.data?.subscription?.character_limit || 0;
        
        return {
            status: 'HEALTHY',
            responseTime: `${responseTime}ms`,
            usage: `${charCount}/${charLimit} chars`,
            metrics: {
                response_time_ms: responseTime,
                status_code: response.status,
                character_count: charCount,
                character_limit: charLimit,
                error_rate: 0,
                endpoint: 'api.elevenlabs.io'
            }
        };
    } catch (error) {
        return {
            status: error.response?.status === 401 ? 'AUTH_ERROR' : 'DEGRADED',
            responseTime: 'timeout',
            metrics: {
                error: error.message,
                status_code: error.response?.status || 0,
                error_rate: 1,
                endpoint: 'api.elevenlabs.io'
            }
        };
    }
}

async function checkHumeAPI() {
    try {
        const apiKey = process.env.HUME_EVI_API_KEY || 'ZO4I7zffvMCBTwytSvoCnSI9CrZjYfjdytH0039ST3CGgi1I';
        const startTime = Date.now();
        const response = await axios.get('https://api.hume.ai/v0/models', {
            headers: { 'X-Hume-Api-Key': apiKey },
            timeout: 5000
        });
        const responseTime = Date.now() - startTime;
        
        return {
            status: 'HEALTHY',
            responseTime: `${responseTime}ms`,
            models: response.data?.models?.length || 0,
            metrics: {
                response_time_ms: responseTime,
                status_code: response.status,
                models_available: response.data?.models?.length || 0,
                error_rate: 0,
                endpoint: 'api.hume.ai'
            }
        };
    } catch (error) {
        return {
            status: error.response?.status === 401 ? 'AUTH_ERROR' : 'DEGRADED',
            responseTime: 'timeout',
            metrics: {
                error: error.message,
                status_code: error.response?.status || 0,
                error_rate: 1,
                endpoint: 'api.hume.ai'
            }
        };
    }
}

// Generic pgrep checker with process stats
async function checkPgrepProcess(processName) {
    try {
        const { stdout: pidOutput } = await execAsync(`pgrep -if ${processName} || true`);
        const pids = pidOutput.trim().split('\n').filter(p => p);
        const pid = pids[0];
        
        if (!pid) {
            return {
                status: 'DEAD',
                metrics: {
                    process_running: false,
                    message: `Process ${processName} not found`
                }
            };
        }
        
        const stats = await getProcessStats(pid);
        
        return {
            status: 'LIVE',
            pid: pid,
            cpu: stats?.cpu_percent || 0,
            memory: stats?.memory_mb || 0,
            uptime: formatUptime(stats?.uptime),
            metrics: {
                process_running: true,
                pid: pid,
                cpu_percent: stats?.cpu_percent || 0,
                memory_mb: stats?.memory_mb || 0,
                command: stats?.command || processName,
                message: `Process running (PID: ${pid})`
            }
        };
    } catch (error) {
        return {
            status: 'ERROR',
            metrics: { error: error.message }
        };
    }
}

module.exports = {
    checkUDPSocket,
    checkAsteriskCore,
    checkPostgreSQL,
    checkDeepgramAPI,
    checkDeepLAPI,
    checkElevenLabsAPI,
    checkHumeAPI,
    checkPortListener,
    checkPgrepProcess,
    getProcessStats,
    formatUptime
};
