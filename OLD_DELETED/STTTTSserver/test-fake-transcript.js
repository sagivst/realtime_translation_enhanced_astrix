// Test script to send fake transcripts to webpage
setTimeout(() => {
    console.log('Sending fake transcripts to test webpage...');
    
    if (!global.io) {
        console.error('Socket.IO not found!');
        process.exit(1);
    }
    
    // Send a series of fake transcripts
    console.log('[TEST] Sending partial transcript...');
    global.io.emit('transcriptionPartial', {
        text: 'Hello this is a test',
        language: 'en',
        type: 'partial'
    });
    
    setTimeout(() => {
        console.log('[TEST] Sending final transcript...');
        global.io.emit('transcriptionFinal', {
            text: 'Hello this is a test of the transcription system',
            language: 'en',
            confidence: 0.95,
            type: 'final'
        });
        
        console.log('[TEST] Fake transcripts sent! Check http://4.185.84.26:3000/test-live-stream.html');
        console.log('[TEST] You should see the text appear if Socket.IO is working');
    }, 2000);
    
}, 3000);
