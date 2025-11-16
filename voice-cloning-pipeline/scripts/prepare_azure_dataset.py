#!/usr/bin/env python3
"""
Prepare Azure Custom Neural Voice dataset
"""
import os
import sys
import json
import shutil
from pathlib import Path

def prepare_dataset(user_id, processed_dir, transcripts_file, output_dir):
    """Create Azure-format training dataset"""
    print(f"\nPreparing Azure dataset for: {user_id}")

    # Load transcripts
    with open(transcripts_file, 'r') as f:
        utterances = json.load(f)

    # Create output structure
    audio_dir = os.path.join(output_dir, user_id, "audio")
    os.makedirs(audio_dir, exist_ok=True)

    transcript_lines = []

    print(f"Processing {len(utterances)} utterances...")

    for i, utt in enumerate(utterances):
        # Generate clean filename
        utterance_id = f"{user_id}_{i:05d}"
        new_filename = f"{utterance_id}.wav"

        # Copy audio file
        src_path = os.path.join(processed_dir, user_id, utt["file"])
        dst_path = os.path.join(audio_dir, new_filename)

        if os.path.exists(src_path):
            shutil.copy2(src_path, dst_path)

            # Add to transcript
            transcript_lines.append(f"{new_filename}|{utt['text']}")

    # Write transcript file
    transcript_file = os.path.join(output_dir, user_id, "transcript.txt")
    with open(transcript_file, 'w', encoding='utf-8') as f:
        f.write("\n".join(transcript_lines))

    print(f"✓ Created Azure dataset:")
    print(f"  Audio files: {len(transcript_lines)}")
    print(f"  Output: {output_dir}/{user_id}/")

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python prepare_azure_dataset.py <user_id> <processed_dir> <transcripts_file> <output_dir>")
        sys.exit(1)

    prepare_dataset(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
