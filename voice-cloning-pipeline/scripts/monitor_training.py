#!/usr/bin/env python3
"""
Monitor training status for all users and auto-deploy when ready
"""

import os
import sys
import json
import time
from datetime import datetime
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))
from azure_voice_manager import AzureVoiceManager


def load_batch_results():
    """Load results from batch processing"""
    results_file = "batch_training_results.json"

    if not os.path.exists(results_file):
        print(f"✗ No batch results found: {results_file}")
        print(f"  Run batch_train_all_users.py first")
        return None

    with open(results_file, 'r') as f:
        return json.load(f)


def update_config_file(user_id, endpoint_id):
    """Update agent-voices.json with endpoint ID"""
    config_file = "config/agent-voices.json"

    with open(config_file, 'r') as f:
        config = json.load(f)

    if user_id in config["agents"]:
        config["agents"][user_id]["endpointId"] = endpoint_id
        config["agents"][user_id]["status"] = "deployed"
        config["agents"][user_id]["deployed_at"] = datetime.now().isoformat()

        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)

        print(f"  ✓ Updated config: {user_id} → {endpoint_id}")
    else:
        print(f"  ⚠️  User {user_id} not found in config")


def monitor_and_deploy(poll_interval=300, auto_deploy=True):
    """
    Monitor training progress and auto-deploy when ready

    Args:
        poll_interval: Seconds between status checks (default: 5 minutes)
        auto_deploy: Automatically deploy endpoints when training completes
    """
    print(f"{'='*80}")
    print(f"VOICE TRAINING MONITOR")
    print(f"{'='*80}")
    print(f"Poll interval: {poll_interval}s ({poll_interval/60:.0f} minutes)")
    print(f"Auto-deploy: {auto_deploy}")
    print(f"")

    # Load batch results
    results = load_batch_results()
    if not results:
        return

    # Initialize manager
    manager = AzureVoiceManager('.env.voice-cloning')

    # Track which users still need monitoring
    pending_users = [
        r for r in results
        if r.get("status") == "training_in_progress" and "model_id" in r
    ]

    if not pending_users:
        print("✓ No users in training state")
        return

    print(f"Monitoring {len(pending_users)} users:")
    for r in pending_users:
        print(f"  • {r['user_id']}")
    print("")

    # Monitor loop
    completed = []
    failed = []

    while pending_users:
        print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Checking status...")
        print(f"{'-'*80}")

        for result in pending_users[:]:  # Copy list to allow removal
            user_id = result["user_id"]
            project_id = result.get("project_id")
            model_id = result.get("model_id")

            if not project_id or not model_id:
                print(f"  {user_id}: Missing project/model ID")
                continue

            # Check status
            status_info = manager.check_training_status(project_id, model_id)
            status = status_info["status"]
            progress = status_info.get("progress", 0)

            if status == "Succeeded":
                print(f"  ✓ {user_id}: Training COMPLETE! 🎉")

                if auto_deploy:
                    print(f"    Deploying endpoint...")
                    endpoint_id = manager.deploy_endpoint(
                        project_id,
                        model_id,
                        user_id
                    )

                    if endpoint_id:
                        # Update configuration file
                        update_config_file(user_id, endpoint_id)

                        result["endpoint_id"] = endpoint_id
                        result["status"] = "deployed"
                        completed.append(result)
                    else:
                        result["status"] = "deployment_failed"
                        failed.append(result)
                else:
                    completed.append(result)

                pending_users.remove(result)

            elif status == "Failed":
                print(f"  ✗ {user_id}: Training FAILED")
                result["status"] = "training_failed"
                failed.append(result)
                pending_users.remove(result)

            elif status == "Running":
                print(f"  ⏳ {user_id}: Training... {progress}%")

            else:
                print(f"  ? {user_id}: {status}")

        if pending_users:
            print(f"\nWaiting {poll_interval}s for next check...")
            print(f"Press Ctrl+C to stop monitoring (training will continue)")
            try:
                time.sleep(poll_interval)
            except KeyboardInterrupt:
                print(f"\n\n✋ Monitoring stopped by user")
                print(f"Training continues in background")
                print(f"Run this script again to resume monitoring")
                break

    # Final summary
    print(f"\n{'='*80}")
    print(f"MONITORING SUMMARY")
    print(f"{'='*80}")
    print(f"Completed: {len(completed)}")
    print(f"Failed: {len(failed)}")
    print(f"Still training: {len(pending_users)}")

    if completed:
        print(f"\n✓ Successfully deployed:")
        for r in completed:
            print(f"  • {r['user_id']}: {r.get('endpoint_id', 'N/A')}")

    if failed:
        print(f"\n✗ Failed:")
        for r in failed:
            print(f"  • {r['user_id']}: {r.get('status', 'Unknown')}")

    # Update batch results file
    all_results = completed + failed + pending_users
    with open("batch_training_results.json", 'w') as f:
        json.dump(all_results, f, indent=2)

    print(f"\n✓ Results updated: batch_training_results.json")


def main():
    """CLI interface for monitor"""
    import argparse

    parser = argparse.ArgumentParser(description="Monitor voice training")
    parser.add_argument('--interval', type=int, default=300,
                       help="Poll interval in seconds (default: 300 = 5 min)")
    parser.add_argument('--no-deploy', action='store_true',
                       help="Don't auto-deploy endpoints")

    args = parser.parse_args()

    monitor_and_deploy(
        poll_interval=args.interval,
        auto_deploy=not args.no_deploy
    )


if __name__ == "__main__":
    main()
