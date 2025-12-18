// Test Socket.IO emission
console.log('Waiting 3 seconds for server to be ready...');

setTimeout(() => {
    console.log('Emitting test transcription events...');
    
    if (!global.io) {
        console.error('Socket.IO not found in global scope!');
        process.exit(1);
    }
    
    // Emit test transcriptions
    console.log('Sending partial transcription...');
    global.io.emit('transcriptionPartial', {
        text: 'This is a test partial transcription',
        language: 'en',
        type: 'partial'
    });
    
    setTimeout(() => {
        console.log('Sending final transcription...');
        global.io.emit('transcriptionFinal', {
            text: 'This is a test final transcription from the system',
            language: 'en',
            confidence: 0.95,
            type: 'final'
        });
    }, 2000);
    
    console.log('Test events sent. Check the webpage: http://4.185.84.26:3000/test-live-stream.html');
}, 3000);
