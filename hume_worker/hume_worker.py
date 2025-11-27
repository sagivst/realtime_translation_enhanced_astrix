#!/usr/bin/env python3
"""
Hume AI Emotion/Prosody Streaming Worker
Separate Python process that handles real-time Hume WebSocket streaming
Receives audio from Node.js AI Server, sends to Hume, returns emotion results
"""

import asyncio
import json
import logging
import time
from typing import Dict, Optional
from datetime import datetime
from collections import deque

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Hume SDK imports
from hume import HumeStreamClient
from hume.models.config import ProsodyConfig

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(title="Hume Emotion Worker", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
HUME_API_KEY = "ZO4I7zffvMCBTwytSvoCnSI9CrZjYfjdytH0039ST3CGgi1I"
AUDIO_SAMPLE_RATE = 16000  # 16kHz PCM
CHUNK_SIZE_MS = 40  # 40ms chunks
CHUNK_SIZE_BYTES = int((AUDIO_SAMPLE_RATE * 2 * CHUNK_SIZE_MS) / 1000)  # 1280 bytes

# Global state management
class HumeState:
    """Manages Hume connections and health metrics for each extension"""

    def __init__(self):
        self.connections: Dict[str, dict] = {}  # extension_id -> connection state
        self.health = {
            "connection": "disconnected",
            "latency_ms_avg": 0.0,
            "latency_ms_max": 0,
            "chunk_rate_fps": 0,
            "errors_past_minute": 0,
            "last_message_age_ms": 0,
            "uptime_seconds": 0,
            "last_error": None,
            "extensions_active": 0
        }
        self.latency_history = deque(maxlen=100)  # Last 100 latencies
        self.error_timestamps = deque(maxlen=100)  # Last 100 error times
        self.start_time = time.time()
        self.last_message_time = None
        self.frame_count = 0
        self.frame_start_time = time.time()

    def update_latency(self, latency_ms: float):
        """Update latency metrics"""
        self.latency_history.append(latency_ms)
        if self.latency_history:
            self.health["latency_ms_avg"] = sum(self.latency_history) / len(self.latency_history)
            self.health["latency_ms_max"] = max(self.latency_history)

    def record_error(self, error_msg: str):
        """Record error occurrence"""
        self.error_timestamps.append(time.time())
        self.health["last_error"] = error_msg
        # Count errors in past minute
        now = time.time()
        self.health["errors_past_minute"] = sum(1 for t in self.error_timestamps if now - t < 60)

    def update_message_received(self):
        """Update message timing"""
        self.last_message_time = time.time()
        self.health["last_message_age_ms"] = 0
        self.frame_count += 1

    def update_health(self):
        """Update dynamic health metrics"""
        now = time.time()
        self.health["uptime_seconds"] = int(now - self.start_time)

        # Update last message age
        if self.last_message_time:
            self.health["last_message_age_ms"] = int((now - self.last_message_time) * 1000)

        # Update FPS
        elapsed = now - self.frame_start_time
        if elapsed >= 1.0:
            self.health["chunk_rate_fps"] = int(self.frame_count / elapsed)
            self.frame_count = 0
            self.frame_start_time = now

        # Count active extensions
        self.health["extensions_active"] = len([c for c in self.connections.values() if c.get("active", False)])

        # Update connection status based on active connections
        if self.health["extensions_active"] > 0:
            self.health["connection"] = "open"
        elif any(c.get("error") for c in self.connections.values()):
            self.health["connection"] = "error"
        else:
            self.health["connection"] = "disconnected"

hume_state = HumeState()


def calculate_valence(emotion_scores):
    """
    Calculate valence (-1 to 1) from emotion scores
    Positive emotions increase valence, negative decrease it
    """
    positive_emotions = ['Joy', 'Excitement', 'Interest', 'Love', 'Pride', 'Amusement', 'Contentment']
    negative_emotions = ['Anger', 'Fear', 'Sadness', 'Disgust', 'Anxiety', 'Shame', 'Distress']

    valence = 0.0
    for emotion in emotion_scores:
        name = emotion.get('name', '')
        score = emotion.get('score', 0)
        if name in positive_emotions:
            valence += score
        elif name in negative_emotions:
            valence -= score

    # Normalize to -1 to 1
    return max(-1.0, min(1.0, valence))


def calculate_arousal(emotion_scores):
    """
    Calculate arousal (0 to 1) from emotion scores
    High-energy emotions increase arousal
    """
    high_arousal_emotions = ['Anger', 'Fear', 'Excitement', 'Anxiety', 'Surprise', 'Joy']
    low_arousal_emotions = ['Sadness', 'Calm', 'Boredom', 'Tiredness', 'Contentment']

    arousal = 0.5  # Neutral baseline
    for emotion in emotion_scores:
        name = emotion.get('name', '')
        score = emotion.get('score', 0)
        if name in high_arousal_emotions:
            arousal += score * 0.5
        elif name in low_arousal_emotions:
            arousal -= score * 0.5

    # Normalize to 0 to 1
    return max(0.0, min(1.0, arousal))


async def handle_hume_streaming(extension_id: str, ai_server_ws: WebSocket):
    """
    Main function to handle Hume streaming for one extension
    Connects to Hume WebSocket, receives audio from Node.js, sends to Hume, returns results
    """
    logger.info(f"[HUME-{extension_id}] Starting Hume streaming connection")

    # Initialize connection state
    hume_state.connections[extension_id] = {
        "active": True,
        "start_time": time.time(),
        "frames_sent": 0,
        "frames_received": 0,
        "error": None
    }

    hume_client = None
    hume_socket = None
    audio_buffer = bytearray()

    try:
        # Create Hume Stream Client
        hume_client = HumeStreamClient(api_key=HUME_API_KEY)
        logger.info(f"[HUME-{extension_id}] Created HumeStreamClient")

        # Connect to Hume with Prosody model
        hume_socket = await hume_client.connect(
            config=ProsodyConfig(
                identify_speakers=False,
                granularity="word"
            )
        )
        logger.info(f"[HUME-{extension_id}] ✓ Connected to Hume WebSocket")

        hume_state.connections[extension_id]["hume_socket"] = hume_socket
        hume_state.update_health()

        # Task to receive audio from Node.js AI Server and send to Hume
        async def audio_sender():
            """Receive audio from Node.js, send to Hume"""
            try:
                while True:
                    # Receive audio chunk from Node.js AI Server
                    audio_data = await ai_server_ws.receive_bytes()

                    # Add to buffer
                    audio_buffer.extend(audio_data)

                    # Send optimal-sized chunks to Hume (40ms = 1280 bytes at 16kHz PCM S16LE)
                    while len(audio_buffer) >= CHUNK_SIZE_BYTES:
                        chunk = bytes(audio_buffer[:CHUNK_SIZE_BYTES])
                        audio_buffer[:CHUNK_SIZE_BYTES] = []

                        # Send to Hume
                        await hume_socket.send_audio(chunk)

                        hume_state.connections[extension_id]["frames_sent"] += 1

                        if hume_state.connections[extension_id]["frames_sent"] % 100 == 0:
                            logger.info(f"[HUME-{extension_id}] Sent {hume_state.connections[extension_id]['frames_sent']} audio frames to Hume")

            except WebSocketDisconnect:
                logger.info(f"[HUME-{extension_id}] Node.js disconnected")
            except Exception as e:
                logger.error(f"[HUME-{extension_id}] Audio sender error: {e}")
                hume_state.record_error(str(e))

        # Task to receive emotion results from Hume and send to Node.js
        async def emotion_receiver():
            """Receive emotion results from Hume, send to Node.js"""
            try:
                async for message in hume_socket:
                    start_time = time.time()

                    # Update message timing
                    hume_state.update_message_received()
                    hume_state.connections[extension_id]["frames_received"] += 1

                    # Parse Hume response
                    if hasattr(message, 'prosody') and message.prosody:
                        prosody_data = message.prosody

                        # Extract emotion scores
                        if hasattr(prosody_data, 'predictions') and prosody_data.predictions:
                            prediction = prosody_data.predictions[0]

                            if hasattr(prediction, 'emotions') and prediction.emotions:
                                emotions = prediction.emotions

                                # Convert to list of dicts
                                emotion_list = [
                                    {"name": e.name, "score": e.score}
                                    for e in emotions[:5]  # Top 5 emotions
                                ]

                                # Calculate valence and arousal
                                valence = calculate_valence(emotion_list)
                                arousal = calculate_arousal(emotion_list)

                                # Create emotion data packet
                                emotion_data = {
                                    "extensionId": extension_id,
                                    "emotions": emotion_list,
                                    "prosody": {
                                        "valence": round(valence, 3),
                                        "arousal": round(arousal, 3)
                                    },
                                    "timestamp": int(time.time() * 1000)
                                }

                                # Send to Node.js AI Server
                                await ai_server_ws.send_json(emotion_data)

                                # Calculate latency
                                latency_ms = (time.time() - start_time) * 1000
                                hume_state.update_latency(latency_ms)

                                # Log top emotion
                                top_emotion = emotion_list[0]
                                logger.info(f"[HUME-{extension_id}] ✓ Emotion: {top_emotion['name']} ({top_emotion['score']*100:.1f}%), valence={valence:.2f}, arousal={arousal:.2f}, latency={latency_ms:.1f}ms")

                    hume_state.update_health()

            except Exception as e:
                logger.error(f"[HUME-{extension_id}] Emotion receiver error: {e}")
                hume_state.record_error(str(e))

        # Run both tasks concurrently
        await asyncio.gather(
            audio_sender(),
            emotion_receiver()
        )

    except Exception as e:
        logger.error(f"[HUME-{extension_id}] Connection error: {e}")
        hume_state.connections[extension_id]["error"] = str(e)
        hume_state.record_error(str(e))
        hume_state.update_health()

    finally:
        # Cleanup
        if hume_socket:
            await hume_socket.close()

        hume_state.connections[extension_id]["active"] = False
        hume_state.update_health()

        logger.info(f"[HUME-{extension_id}] Connection closed")


@app.websocket("/ws/audio/{extension_id}")
async def websocket_audio_endpoint(websocket: WebSocket, extension_id: str):
    """
    WebSocket endpoint to receive audio from Node.js AI Server
    extension_id: "3333" or "4444"
    """
    await websocket.accept()
    logger.info(f"[WS] Node.js AI Server connected for extension {extension_id}")

    try:
        await handle_hume_streaming(extension_id, websocket)
    except Exception as e:
        logger.error(f"[WS] Error handling extension {extension_id}: {e}")
    finally:
        logger.info(f"[WS] Node.js AI Server disconnected for extension {extension_id}")


@app.get("/health/hume")
async def health_hume():
    """
    Health monitoring endpoint for Hume streaming
    Returns JSON with connection status, latency, FPS, errors
    Polled by HTML dashboard every 1 second
    """
    hume_state.update_health()
    return JSONResponse(content=hume_state.health)


@app.get("/health")
async def health():
    """Basic health check"""
    return {"status": "ok", "service": "hume_worker", "timestamp": int(time.time())}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Hume AI Emotion/Prosody Worker",
        "version": "1.0.0",
        "endpoints": {
            "websocket": "/ws/audio/{extension_id}",
            "health": "/health/hume",
            "root_health": "/health"
        }
    }


if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("Starting Hume AI Emotion/Prosody Worker")
    logger.info("=" * 60)
    logger.info(f"API Key: {HUME_API_KEY[:20]}...")
    logger.info(f"Audio Format: {AUDIO_SAMPLE_RATE}Hz PCM S16LE")
    logger.info(f"Chunk Size: {CHUNK_SIZE_MS}ms ({CHUNK_SIZE_BYTES} bytes)")
    logger.info("=" * 60)

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )
