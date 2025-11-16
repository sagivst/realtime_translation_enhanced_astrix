#!/usr/bin/env python3
"""
Transcribe WAV files using OpenAI Whisper
"""
import os
import sys
import json
import whisper
from pathlib import Path

def transcribe_user_recordings(user_id, processed_dir, output_dir):
    """Transcribe all WAV files for a user"""
    print(f"\n{'='*60}")
    print(f"Transcribing: {user_id}")
    print(f"{'='*60}")

    # Load Whisper model
    print("Loading Whisper model (base)...")
    model = whisper.load_model("base")

    wav_dir = os.path.join(processed_dir, user_id)
    wav_files = list(Path(wav_dir).glob("*.wav"))

    if not wav_files:
        print(f"⚠️  No WAV files found in {wav_dir}")
        return

    print(f"Found {len(wav_files)} audio files")

    utterances = []

    for i, wav_file in enumerate(wav_files, 1):
        print(f"  [{i}/{len(wav_files)}] {wav_file.name}...", end=" ")

        try:
            # Transcribe
            result = model.transcribe(str(wav_file), language="en")
            text = result["text"].strip()

            if len(text) < 5:
                print("SKIP (too short)")
                continue

            # Get duration
            import wave
            with wave.open(str(wav_file), 'rb') as wf:
                frames = wf.getnframes()
                rate = wf.getframerate()
                duration = frames / float(rate)

            utterances.append({
                "file": wav_file.name,
                "text": text,
                "duration": duration,
                "user_id": user_id
            })

            print(f"✓ ({duration:.1f}s)")

        except Exception as e:
            print(f"✗ Error: {e}")

    # Save transcripts
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, user_id, "transcripts.json")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    with open(output_file, 'w') as f:
        json.dump(utterances, f, indent=2)

    total_duration = sum(u["duration"] for u in utterances)
    print(f"\n✓ Transcribed {len(utterances)} utterances")
    print(f"  Total duration: {total_duration/60:.1f} minutes")
    print(f"  Saved to: {output_file}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python transcribe_all.py <user_id> <processed_dir> <output_dir>")
        sys.exit(1)

    transcribe_user_recordings(sys.argv[1], sys.argv[2], sys.argv[3])
