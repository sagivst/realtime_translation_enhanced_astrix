#!/usr/bin/env python3
"""
Batch process all 4 users: upload → train → deploy
"""

import os
import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))
from azure_voice_manager import AzureVoiceManager

def main():
    """Process all 4 users in parallel"""

    # Configuration for all users
    users = [
        {
            "user_id": "Boyan_Tiholov",
            "display_name": "Boyan Tiholov",
            "training_dir": "voice-cloning-pipeline/data/training-sets/Boyan_Tiholov"
        },
        {
            "user_id": "Denitsa_Dencheva",
            "display_name": "Denitsa Dencheva",
            "training_dir": "voice-cloning-pipeline/data/training-sets/Denitsa_Dencheva"
        },
        {
            "user_id": "Miroslav_Dimitrov",
            "display_name": "Miroslav Dimitrov",
            "training_dir": "voice-cloning-pipeline/data/training-sets/Miroslav_Dimitrov"
        },
        {
            "user_id": "Velislava_Chavdarova",
            "display_name": "Velislava Chavdarova",
            "training_dir": "voice-cloning-pipeline/data/training-sets/Velislava_Chavdarova"
        }
    ]

    # Initialize manager
    print("Initializing Azure Voice Manager...")
    manager = AzureVoiceManager('.env.voice-cloning')

    # Process each user
    results = []

    for i, user in enumerate(users, 1):
        print(f"\n{'='*80}")
        print(f"PROCESSING USER {i}/4: {user['display_name']}")
        print(f"{'='*80}")

        try:
            result = manager.process_user_full_pipeline(
                user["user_id"],
                user["display_name"],
                user["training_dir"],
                wait_for_training=False  # Don't wait, process all in parallel
            )

            results.append(result)

            print(f"\n✓ {user['display_name']}: {result['status']}")

        except Exception as e:
            print(f"\n✗ Error processing {user['display_name']}: {e}")
            results.append({
                "user_id": user["user_id"],
                "status": "error",
                "error": str(e)
            })

    # Save results to file
    output_file = "batch_training_results.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)

    # Print summary
    print(f"\n{'='*80}")
    print(f"BATCH PROCESSING COMPLETE")
    print(f"{'='*80}")

    for result in results:
        user_id = result["user_id"]
        status = result["status"]
        icon = "✓" if status in ["training_in_progress", "completed"] else "✗"
        print(f"{icon} {user_id}: {status}")

    print(f"\n✓ Results saved to: {output_file}")
    print(f"\nNext steps:")
    print(f"1. Training will complete in 6-12 hours")
    print(f"2. Monitor status with: python monitor_training.py")
    print(f"3. Auto-deploy endpoints when ready")


if __name__ == "__main__":
    main()
