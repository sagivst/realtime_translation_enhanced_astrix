/**
 * SIP Channel Manager
 *
 * Manages SIP endpoints, channel lifecycle, and translation sessions:
 * - SIP endpoint registration
 * - Incoming/outgoing call handling
 * - Translation channel creation and management
 * - Integration with Asterisk AMI/ARI
 * - Channel state tracking
 * - Conference bridge coordination
 */

const EventEmitter = require('events');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * Channel states
 */
const ChannelState = {
  IDLE: 'idle',
  RINGING: 'ringing',
  CONNECTED: 'connected',
  TRANSLATING: 'translating',
  DISCONNECTING: 'disconnecting',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
};

/**
 * Translation modes
 */
const TranslationMode = {
  BIDIRECTIONAL: 'bidirectional',    // Both directions translated
  UNIDIRECTIONAL: 'unidirectional',  // One direction only
  PASSTHROUGH: 'passthrough'         // No translation
};

class SIPChannelManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      // Asterisk connection
      asteriskHost: config.asteriskHost || 'localhost',
      asteriskAMIPort: config.asteriskAMIPort || 5038,
      asteriskARIPort: config.asteriskARIPort || 8088,
      asteriskAMIUser: config.asteriskAMIUser || 'admin',
      asteriskAMISecret: config.asteriskAMISecret || 'secret',

      // SIP settings
      sipDomain: config.sipDomain || 'localhost',
      sipPort: config.sipPort || 5060,

      // Translation settings
      defaultTranslationMode: config.defaultTranslationMode || TranslationMode.BIDIRECTIONAL,
      defaultSourceLang: config.defaultSourceLang || 'en',
      defaultTargetLang: config.defaultTargetLang || 'ja',

      // Channel settings
      maxChannels: config.maxChannels || 100,
      channelTimeout: config.channelTimeout || 3600000,  // 1 hour

      // Conference settings
      conferencePrefix: config.conferencePrefix || 'translation_',

      // Pipe settings
      pipeBasePath: config.pipeBasePath || '/tmp/asterisk_media',

      ...config
    };

    // Active channels registry
    this.channels = new Map();  // channelId -> channel info

    // SIP endpoints registry
    this.endpoints = new Map();  // endpointId -> endpoint info

    // Conference bridges
    this.conferences = new Map();  // conferenceId -> conference info

    // Statistics
    this.stats = {
      totalChannels: 0,
      activeChannels: 0,
      totalCalls: 0,
      activeCalls: 0,
      totalTranslations: 0,
      errors: 0
    };

    // Asterisk connection (will be initialized)
    this.ami = null;
    this.ari = null;

    console.log('[SIPChannelManager] Initialized with config:', {
      asteriskHost: this.config.asteriskHost,
      sipDomain: this.config.sipDomain,
      maxChannels: this.config.maxChannels
    });
  }

  /**
   * Initialize SIP manager and connect to Asterisk
   */
  async initialize() {
    console.log('[SIPChannelManager] Initializing...');

    // Create pipe directory if it doesn't exist
    try {
      await fs.mkdir(this.config.pipeBasePath, { recursive: true });
      await fs.chmod(this.config.pipeBasePath, 0o777);
      console.log(`[SIPChannelManager] Pipe directory ready: ${this.config.pipeBasePath}`);
    } catch (error) {
      console.warn('[SIPChannelManager] Could not create pipe directory:', error.message);
    }

    // Note: Actual AMI/ARI connection would be implemented here
    // For now, we'll use a simplified approach

    console.log('[SIPChannelManager] Initialized successfully');
    this.emit('initialized');
  }

  /**
   * Register SIP endpoint
   */
  async registerEndpoint(endpointConfig) {
    const {
      endpointId,
      userId,
      username,
      displayName,
      password,
      language = this.config.defaultSourceLang,
      context = 'translation'
    } = endpointConfig;

    if (this.endpoints.has(endpointId)) {
      throw new Error(`Endpoint ${endpointId} already registered`);
    }

    const endpoint = {
      endpointId,
      userId,
      username,
      displayName,
      password,
      language,
      context,
      registered: false,
      registeredAt: null,
      lastActivity: Date.now(),
      activeChannels: []
    };

    this.endpoints.set(endpointId, endpoint);

    console.log(`[SIPChannelManager] Registered endpoint: ${endpointId} (${displayName})`);
    this.emit('endpoint:registered', { endpointId, endpoint });

    // Generate Asterisk SIP configuration
    await this.generateSIPConfig(endpoint);

    return endpoint;
  }

  /**
   * Unregister SIP endpoint
   */
  async unregisterEndpoint(endpointId) {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      throw new Error(`Endpoint ${endpointId} not found`);
    }

    // Disconnect any active channels
    for (const channelId of endpoint.activeChannels) {
      await this.disconnectChannel(channelId);
    }

    this.endpoints.delete(endpointId);

    console.log(`[SIPChannelManager] Unregistered endpoint: ${endpointId}`);
    this.emit('endpoint:unregistered', { endpointId });
  }

  /**
   * Create translation channel
   */
  async createChannel(channelConfig) {
    const {
      callerEndpointId,
      calleeEndpointId,
      translationMode = this.config.defaultTranslationMode,
      sourceLang,
      targetLang
    } = channelConfig;

    // Check capacity
    if (this.channels.size >= this.config.maxChannels) {
      throw new Error('Maximum channel capacity reached');
    }

    // Get endpoint info
    const callerEndpoint = this.endpoints.get(callerEndpointId);
    const calleeEndpoint = this.endpoints.get(calleeEndpointId);

    if (!callerEndpoint) {
      throw new Error(`Caller endpoint ${callerEndpointId} not found`);
    }
    if (!calleeEndpoint) {
      throw new Error(`Callee endpoint ${calleeEndpointId} not found`);
    }

    // Generate unique channel ID
    const channelId = this.generateChannelId();
    const conferenceId = `${this.config.conferencePrefix}${channelId}`;

    // Determine languages
    const finalSourceLang = sourceLang || callerEndpoint.language;
    const finalTargetLang = targetLang || calleeEndpoint.language;

    const channel = {
      channelId,
      conferenceId,
      callerEndpointId,
      calleeEndpointId,
      translationMode,
      sourceLang: finalSourceLang,
      targetLang: finalTargetLang,
      state: ChannelState.IDLE,
      createdAt: Date.now(),
      connectedAt: null,
      disconnectedAt: null,

      // Asterisk channels
      callerAsteriskChannel: null,
      calleeAsteriskChannel: null,
      translationChannels: [],

      // Named pipes
      pipes: {
        callerToAsterisk: null,
        callerFromAsterisk: null,
        calleeToAsterisk: null,
        calleeFromAsterisk: null
      },

      // Metrics
      metrics: {
        framesProcessed: 0,
        translationsCompleted: 0,
        averageLatency: 0,
        errors: 0
      }
    };

    this.channels.set(channelId, channel);
    this.stats.totalChannels++;
    this.stats.activeChannels++;

    // Update endpoint channel lists
    callerEndpoint.activeChannels.push(channelId);
    calleeEndpoint.activeChannels.push(channelId);

    console.log(`[SIPChannelManager] Created channel: ${channelId}`);
    console.log(`  Caller: ${callerEndpoint.displayName} (${finalSourceLang})`);
    console.log(`  Callee: ${calleeEndpoint.displayName} (${finalTargetLang})`);
    console.log(`  Mode: ${translationMode}`);

    this.emit('channel:created', { channelId, channel });

    // Auto-connect if both endpoints are registered
    if (callerEndpoint.registered && calleeEndpoint.registered) {
      await this.connectChannel(channelId);
    }

    return channel;
  }

  /**
   * Connect translation channel
   */
  async connectChannel(channelId) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    if (channel.state !== ChannelState.IDLE) {
      throw new Error(`Channel ${channelId} not in IDLE state`);
    }

    console.log(`[SIPChannelManager] Connecting channel: ${channelId}`);
    channel.state = ChannelState.RINGING;

    try {
      // Create conference bridge
      await this.createConference(channel.conferenceId, {
        maxMembers: 10,
        recordConference: false,
        videoMode: 'none'
      });

      // Create ExternalMedia channels for translation
      const callerExtChannel = await this.createExternalMediaChannel(
        `${channelId}_caller`,
        channel.sourceLang
      );

      const calleeExtChannel = await this.createExternalMediaChannel(
        `${channelId}_callee`,
        channel.targetLang
      );

      channel.translationChannels.push(callerExtChannel.id, calleeExtChannel.id);

      // Join channels to conference
      // In real implementation, this would use Asterisk AMI/ARI
      console.log(`[SIPChannelManager] Joining channels to conference ${channel.conferenceId}`);

      // Update channel state
      channel.state = ChannelState.CONNECTED;
      channel.connectedAt = Date.now();
      this.stats.activeCalls++;

      console.log(`[SIPChannelManager] Channel connected: ${channelId}`);
      this.emit('channel:connected', { channelId, channel });

      // Start translation
      await this.startTranslation(channelId);

      return channel;

    } catch (error) {
      console.error(`[SIPChannelManager] Failed to connect channel ${channelId}:`, error);
      channel.state = ChannelState.ERROR;
      this.stats.errors++;
      this.emit('channel:error', { channelId, error });
      throw error;
    }
  }

  /**
   * Start translation for channel
   */
  async startTranslation(channelId) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    console.log(`[SIPChannelManager] Starting translation for channel: ${channelId}`);
    channel.state = ChannelState.TRANSLATING;
    this.stats.totalTranslations++;

    // Setup named pipes for audio streaming
    const pipeBasePath = this.config.pipeBasePath;

    channel.pipes = {
      callerToAsterisk: path.join(pipeBasePath, `${channelId}_caller_to_asterisk.pcm`),
      callerFromAsterisk: path.join(pipeBasePath, `${channelId}_caller_from_asterisk.pcm`),
      calleeToAsterisk: path.join(pipeBasePath, `${channelId}_callee_to_asterisk.pcm`),
      calleeFromAsterisk: path.join(pipeBasePath, `${channelId}_callee_from_asterisk.pcm`)
    };

    this.emit('channel:translating', {
      channelId,
      channel,
      pipes: channel.pipes
    });

    console.log(`[SIPChannelManager] Translation active for channel: ${channelId}`);
  }

  /**
   * Disconnect channel
   */
  async disconnectChannel(channelId) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    console.log(`[SIPChannelManager] Disconnecting channel: ${channelId}`);
    channel.state = ChannelState.DISCONNECTING;

    try {
      // Hangup Asterisk channels
      for (const astChannelId of channel.translationChannels) {
        await this.hangupAsteriskChannel(astChannelId);
      }

      // Destroy conference
      await this.destroyConference(channel.conferenceId);

      // Cleanup named pipes
      await this.cleanupPipes(channel.pipes);

      // Update state
      channel.state = ChannelState.DISCONNECTED;
      channel.disconnectedAt = Date.now();

      // Update stats
      this.stats.activeChannels--;
      if (this.stats.activeCalls > 0) {
        this.stats.activeCalls--;
      }

      // Remove from endpoint channel lists
      const callerEndpoint = this.endpoints.get(channel.callerEndpointId);
      const calleeEndpoint = this.endpoints.get(channel.calleeEndpointId);

      if (callerEndpoint) {
        const index = callerEndpoint.activeChannels.indexOf(channelId);
        if (index > -1) {
          callerEndpoint.activeChannels.splice(index, 1);
        }
      }

      if (calleeEndpoint) {
        const index = calleeEndpoint.activeChannels.indexOf(channelId);
        if (index > -1) {
          calleeEndpoint.activeChannels.splice(index, 1);
        }
      }

      console.log(`[SIPChannelManager] Channel disconnected: ${channelId}`);
      this.emit('channel:disconnected', { channelId, channel });

      // Remove from channels map
      this.channels.delete(channelId);

    } catch (error) {
      console.error(`[SIPChannelManager] Error disconnecting channel ${channelId}:`, error);
      channel.state = ChannelState.ERROR;
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Create ExternalMedia channel in Asterisk
   */
  async createExternalMediaChannel(channelId, language) {
    console.log(`[SIPChannelManager] Creating ExternalMedia channel: ${channelId}`);

    // In real implementation, would use Asterisk ARI to originate channel
    // For now, return mock channel info

    const channel = {
      id: channelId,
      type: 'ExternalMedia',
      language,
      state: 'Up',
      createdAt: Date.now()
    };

    return channel;
  }

  /**
   * Create conference bridge
   */
  async createConference(conferenceId, config) {
    if (this.conferences.has(conferenceId)) {
      console.log(`[SIPChannelManager] Conference ${conferenceId} already exists`);
      return this.conferences.get(conferenceId);
    }

    console.log(`[SIPChannelManager] Creating conference: ${conferenceId}`);

    const conference = {
      conferenceId,
      config,
      members: [],
      createdAt: Date.now()
    };

    this.conferences.set(conferenceId, conference);
    this.emit('conference:created', { conferenceId, conference });

    return conference;
  }

  /**
   * Destroy conference bridge
   */
  async destroyConference(conferenceId) {
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      return;
    }

    console.log(`[SIPChannelManager] Destroying conference: ${conferenceId}`);

    // Kick all members
    // In real implementation, would use Asterisk AMI

    this.conferences.delete(conferenceId);
    this.emit('conference:destroyed', { conferenceId });
  }

  /**
   * Hangup Asterisk channel
   */
  async hangupAsteriskChannel(channelId) {
    console.log(`[SIPChannelManager] Hanging up Asterisk channel: ${channelId}`);
    // In real implementation, would use Asterisk AMI/ARI
  }

  /**
   * Cleanup named pipes
   */
  async cleanupPipes(pipes) {
    for (const [name, pipePath] of Object.entries(pipes)) {
      if (pipePath) {
        try {
          await fs.unlink(pipePath);
          console.log(`[SIPChannelManager] Cleaned up pipe: ${pipePath}`);
        } catch (error) {
          // Pipe may not exist, ignore
        }
      }
    }
  }

  /**
   * Generate SIP configuration for endpoint
   */
  async generateSIPConfig(endpoint) {
    // Generate PJSIP configuration
    const config = `
; Auto-generated SIP endpoint configuration
; Endpoint: ${endpoint.endpointId}
; User: ${endpoint.username}

[${endpoint.endpointId}]
type=endpoint
context=${endpoint.context}
disallow=all
allow=ulaw
allow=alaw
auth=${endpoint.endpointId}
aors=${endpoint.endpointId}
language=${endpoint.language}

[${endpoint.endpointId}]
type=auth
auth_type=userpass
username=${endpoint.username}
password=${endpoint.password}

[${endpoint.endpointId}]
type=aor
max_contacts=1
`;

    console.log(`[SIPChannelManager] Generated SIP config for ${endpoint.endpointId}`);

    // In real implementation, would write to Asterisk config and reload
    return config;
  }

  /**
   * Generate unique channel ID
   */
  generateChannelId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `ch_${timestamp}_${random}`;
  }

  /**
   * Get channel info
   */
  getChannel(channelId) {
    return this.channels.get(channelId);
  }

  /**
   * Get all active channels
   */
  getActiveChannels() {
    return Array.from(this.channels.values()).filter(
      ch => ch.state === ChannelState.CONNECTED || ch.state === ChannelState.TRANSLATING
    );
  }

  /**
   * Get endpoint info
   */
  getEndpoint(endpointId) {
    return this.endpoints.get(endpointId);
  }

  /**
   * Get all endpoints
   */
  getAllEndpoints() {
    return Array.from(this.endpoints.values());
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      endpoints: this.endpoints.size,
      conferences: this.conferences.size
    };
  }

  /**
   * Shutdown SIP manager
   */
  async shutdown() {
    console.log('[SIPChannelManager] Shutting down...');

    // Disconnect all active channels
    const channelIds = Array.from(this.channels.keys());
    for (const channelId of channelIds) {
      try {
        await this.disconnectChannel(channelId);
      } catch (error) {
        console.error(`[SIPChannelManager] Error disconnecting channel ${channelId}:`, error);
      }
    }

    // Unregister all endpoints
    const endpointIds = Array.from(this.endpoints.keys());
    for (const endpointId of endpointIds) {
      try {
        await this.unregisterEndpoint(endpointId);
      } catch (error) {
        console.error(`[SIPChannelManager] Error unregistering endpoint ${endpointId}:`, error);
      }
    }

    console.log('[SIPChannelManager] Shutdown complete');
    this.emit('shutdown');
  }
}

module.exports = {
  SIPChannelManager,
  ChannelState,
  TranslationMode
};
