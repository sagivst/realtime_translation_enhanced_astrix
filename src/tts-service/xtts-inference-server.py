#!/usr/bin/env python3
"""
XTTS v2 Inference Server
Handles local text-to-speech synthesis with custom voice embeddings
"""

import os
import sys
import argparse
import logging
from flask import Flask, request, jsonify, send_file
from io import BytesIO
import numpy as np
import torch
from TTS.api import TTS

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Global TTS model instance
tts_model = None
device = None


def initialize_model(model_path, sample_rate):
    """Initialize XTTS v2 model"""
    global tts_model, device

    logger.info("Initializing XTTS v2 model...")

    # Check for GPU availability
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device}")

    if device == "cpu":
        logger.warning("⚠️  Running on CPU - synthesis will be slower. GPU recommended for production.")

    try:
        # Initialize TTS with XTTS v2
        tts_model = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2",
                        progress_bar=False).to(device)

        logger.info("✓ XTTS v2 model loaded successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to load XTTS v2 model: {e}")
        raise


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': tts_model is not None,
        'device': device
    })


@app.route('/synthesize', methods=['POST'])
def synthesize():
    """
    Synthesize speech from text

    Expected JSON payload:
    {
        "text": "Text to synthesize",
        "embedding": "base64_encoded_embedding_data",
        "language": "en",
        "sample_rate": 16000
    }
    """
    try:
        data = request.get_json()

        text = data.get('text')
        language = data.get('language', 'en')
        sample_rate = data.get('sample_rate', 16000)

        if not text:
            return jsonify({'error': 'Text is required'}), 400

        logger.info(f"Synthesizing: '{text[:50]}...' (lang: {language})")

        start_time = torch.cuda.Event(enable_timing=True) if device == "cuda" else None
        end_time = torch.cuda.Event(enable_timing=True) if device == "cuda" else None

        if start_time:
            start_time.record()

        # For now, use default speaker voice
        # TODO: Load custom embeddings from data.get('embedding')
        # This will be implemented when we have the voice profile system ready

        # Synthesize with XTTS v2
        wav = tts_model.tts(
            text=text,
            language=language,
            speaker_wav=None  # Will use embedding later
        )

        if end_time:
            end_time.record()
            torch.cuda.synchronize()
            latency_ms = start_time.elapsed_time(end_time)
            logger.info(f"Synthesis latency: {latency_ms:.2f}ms")

        # Convert to numpy array
        wav_array = np.array(wav)

        # Convert to 16-bit PCM
        wav_int16 = (wav_array * 32767).astype(np.int16)

        # Create BytesIO buffer
        audio_buffer = BytesIO()
        audio_buffer.write(wav_int16.tobytes())
        audio_buffer.seek(0)

        return send_file(
            audio_buffer,
            mimetype='audio/pcm',
            as_attachment=False,
            download_name='synthesis.pcm'
        )

    except Exception as e:
        logger.error(f"Synthesis error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/load-speaker', methods=['POST'])
def load_speaker():
    """
    Load custom speaker embedding

    Expected JSON payload:
    {
        "embedding_id": "voice_profile_123",
        "embedding_data": "base64_encoded_data"
    }
    """
    try:
        data = request.get_json()
        embedding_id = data.get('embedding_id')

        # TODO: Implement speaker embedding loading
        # This will integrate with the voice profile system

        return jsonify({
            'status': 'success',
            'embedding_id': embedding_id,
            'message': 'Speaker embedding loaded (stub - full implementation pending)'
        })

    except Exception as e:
        logger.error(f"Error loading speaker: {e}")
        return jsonify({'error': str(e)}), 500


def main():
    parser = argparse.ArgumentParser(description='XTTS v2 Inference Server')
    parser.add_argument('--model-path', type=str, default='./models/xtts-v2',
                        help='Path to XTTS v2 model')
    parser.add_argument('--sample-rate', type=int, default=16000,
                        help='Audio sample rate (Hz)')
    parser.add_argument('--port', type=int, default=5001,
                        help='Server port')
    parser.add_argument('--host', type=str, default='127.0.0.1',
                        help='Server host')

    args = parser.parse_args()

    # Initialize model
    try:
        initialize_model(args.model_path, args.sample_rate)
        print("Server ready", flush=True)  # Signal to Node.js that we're ready
    except Exception as e:
        logger.error(f"Failed to initialize: {e}")
        sys.exit(1)

    # Start Flask server
    logger.info(f"Starting server on {args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=False, threaded=True)


if __name__ == '__main__':
    main()
