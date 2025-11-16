#!/usr/bin/env python3
"""
Quick test script to verify XTTS v2 installation
"""

import sys
import torch
from TTS.api import TTS

def test_xtts():
    """Test XTTS v2 installation and basic synthesis"""
    print("=" * 50)
    print("XTTS v2 Installation Test")
    print("=" * 50)

    # Check device
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"\n1. Device: {device}")
    if device == "cpu":
        print("   ⚠️  Running on CPU (GPU recommended for production)")
    else:
        print("   ✓ GPU available")

    # Check PyTorch version
    print(f"2. PyTorch version: {torch.__version__}")

    try:
        # Initialize TTS
        print("\n3. Initializing XTTS v2 model...")
        print("   (This may take a moment on first run - downloading model)")

        tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2",
                  progress_bar=True).to(device)

        print("   ✓ Model loaded successfully")

        # Test synthesis
        print("\n4. Testing synthesis...")
        test_text = "Hello, this is a test of the XTTS voice synthesis system."

        # Use tts_to_file with default speaker
        wav = tts.tts(text=test_text, language="en", speaker_wav=None, split_sentences=False)

        print(f"   ✓ Synthesis successful")
        print(f"   Generated audio length: {len(wav)} samples")

        # List available languages
        print("\n5. Available languages:")
        languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'tr',
                     'ru', 'nl', 'cs', 'ar', 'zh-cn', 'ja', 'hu', 'ko']
        for lang in languages:
            print(f"   - {lang}")

        print("\n" + "=" * 50)
        print("✓ All tests passed!")
        print("XTTS v2 is ready for use")
        print("=" * 50)

        return 0

    except Exception as e:
        print(f"\n✗ Error: {e}")
        print("\nTest failed. Please check the error message above.")
        return 1

if __name__ == '__main__':
    sys.exit(test_xtts())
