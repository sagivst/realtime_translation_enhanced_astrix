#!/usr/bin/env python3
"""
Azure Custom Neural Voice - Automated Management System
Handles upload, training, deployment for multiple users via Azure API
"""

import os
import sys
import json
import time
import requests
from pathlib import Path
from datetime import datetime
from azure.storage.blob import BlobServiceClient
from dotenv import load_dotenv

class AzureVoiceManager:
    """Manages Azure Custom Neural Voice lifecycle for multiple users"""

    def __init__(self, env_file=None):
        """Initialize with Azure credentials"""
        if env_file:
            load_dotenv(env_file)

        self.speech_key = os.getenv('AZURE_SPEECH_KEY')
        self.speech_region = os.getenv('AZURE_SPEECH_REGION')
        self.storage_connection = os.getenv('AZURE_STORAGE_CONNECTION_STRING')

        if not all([self.speech_key, self.speech_region, self.storage_connection]):
            raise ValueError("Missing Azure credentials in environment")

        # Azure Custom Voice API endpoints
        self.base_url = f"https://{self.speech_region}.api.cognitive.microsoft.com/customvoice/api/texttospeech/v3.0"
        self.headers = {
            "Ocp-Apim-Subscription-Key": self.speech_key,
            "Content-Type": "application/json"
        }

        # Initialize blob storage client
        self.blob_service = BlobServiceClient.from_connection_string(self.storage_connection)

    def upload_training_data(self, user_id, training_dir, container_name=None):
        """
        Upload training data (audio + transcript) to Azure Blob Storage
        """
        if container_name is None:
            container_name = f"training-{user_id.lower().replace('_', '-')}"

        print(f"\n{'='*60}")
        print(f"Uploading training data for: {user_id}")
        print(f"{'='*60}")

        # Get or create container
        try:
            container_client = self.blob_service.get_container_client(container_name)
            container_client.get_container_properties()
            print(f"✓ Using existing container: {container_name}")
        except:
            container_client = self.blob_service.create_container(container_name)
            print(f"✓ Created container: {container_name}")

        # Upload audio files
        audio_dir = os.path.join(training_dir, "audio")
        audio_files = list(Path(audio_dir).glob("*.wav"))

        print(f"\nUploading {len(audio_files)} audio files...")
        for i, audio_file in enumerate(audio_files, 1):
            blob_name = f"audio/{audio_file.name}"
            blob_client = container_client.get_blob_client(blob_name)

            with open(audio_file, "rb") as data:
                blob_client.upload_blob(data, overwrite=True)

            if i % 10 == 0 or i == len(audio_files):
                print(f"  Uploaded {i}/{len(audio_files)} files...")

        # Upload transcript
        transcript_file = os.path.join(training_dir, "transcript.txt")
        if os.path.exists(transcript_file):
            blob_client = container_client.get_blob_client("transcript.txt")
            with open(transcript_file, "rb") as data:
                blob_client.upload_blob(data, overwrite=True)
            print(f"✓ Uploaded transcript.txt")

        # Get container URL
        container_url = container_client.url

        print(f"✓ Upload complete: {container_url}")

        return {
            "container_name": container_name,
            "container_url": container_url,
            "audio_count": len(audio_files)
        }

    def create_project(self, user_id, display_name, language="en-US"):
        """
        Create a Custom Neural Voice project via API
        """
        print(f"\nCreating Custom Voice project for: {user_id}")

        url = f"{self.base_url}/projects"

        payload = {
            "name": f"CustomVoice-{user_id}",
            "description": f"Custom voice for {display_name}",
            "locale": language,
            "projectKind": "CustomNeuralVoice"
        }

        response = requests.post(url, headers=self.headers, json=payload)

        if response.status_code in [200, 201]:
            project_data = response.json()
            project_id = project_data["id"]
            print(f"✓ Created project: {project_id}")
            return project_id
        else:
            print(f"✗ Error creating project: {response.status_code}")
            print(f"  Response: {response.text}")
            return None

    def create_dataset(self, project_id, user_id, container_url):
        """
        Create dataset from uploaded blob storage
        """
        print(f"\nCreating dataset for project: {project_id}")

        url = f"{self.base_url}/projects/{project_id}/datasets"

        payload = {
            "name": f"Dataset-{user_id}-{datetime.now().strftime('%Y%m%d')}",
            "description": f"Training dataset for {user_id}",
            "locale": "en-US",
            "kind": "AudioAndScript",
            "audioDataUrl": f"{container_url}/audio",
            "scriptUrl": f"{container_url}/transcript.txt"
        }

        response = requests.post(url, headers=self.headers, json=payload)

        if response.status_code in [200, 201]:
            dataset_data = response.json()
            dataset_id = dataset_data["id"]
            print(f"✓ Created dataset: {dataset_id}")
            print(f"  Status: {dataset_data.get('status', 'Unknown')}")
            return dataset_id
        else:
            print(f"✗ Error creating dataset: {response.status_code}")
            print(f"  Response: {response.text}")
            return None

    def wait_for_dataset_validation(self, project_id, dataset_id, timeout=600):
        """
        Wait for dataset validation to complete
        """
        print(f"\nWaiting for dataset validation...")

        url = f"{self.base_url}/projects/{project_id}/datasets/{dataset_id}"

        start_time = time.time()
        while time.time() - start_time < timeout:
            response = requests.get(url, headers=self.headers)

            if response.status_code == 200:
                data = response.json()
                status = data.get("status")

                print(f"  Status: {status}", end='\r')

                if status == "Succeeded":
                    print(f"\n✓ Dataset validation succeeded")
                    return True
                elif status == "Failed":
                    print(f"\n✗ Dataset validation failed")
                    print(f"  Error: {data.get('error', 'Unknown error')}")
                    return False

            time.sleep(10)

        print(f"\n✗ Timeout waiting for validation")
        return False

    def train_model(self, project_id, dataset_id, user_id, voice_name=None):
        """
        Start training a custom voice model
        """
        if voice_name is None:
            voice_name = f"{user_id}-v1"

        print(f"\nStarting training for: {voice_name}")

        url = f"{self.base_url}/projects/{project_id}/models"

        payload = {
            "name": voice_name,
            "description": f"Custom voice model for {user_id}",
            "locale": "en-US",
            "datasetIds": [dataset_id],
            "neuralVoiceName": voice_name,
            "recipe": {
                "version": "latest"
            }
        }

        response = requests.post(url, headers=self.headers, json=payload)

        if response.status_code in [200, 201]:
            model_data = response.json()
            model_id = model_data["id"]
            print(f"✓ Training started: {model_id}")
            print(f"  This will take 6-12 hours...")
            return model_id
        else:
            print(f"✗ Error starting training: {response.status_code}")
            print(f"  Response: {response.text}")
            return None

    def check_training_status(self, project_id, model_id):
        """
        Check training status for a model
        """
        url = f"{self.base_url}/projects/{project_id}/models/{model_id}"

        response = requests.get(url, headers=self.headers)

        if response.status_code == 200:
            data = response.json()
            return {
                "status": data.get("status"),
                "model_id": model_id,
                "name": data.get("name"),
                "created": data.get("createdDateTime"),
                "progress": data.get("trainingProgress", 0)
            }
        else:
            return {"status": "Error", "error": response.text}

    def deploy_endpoint(self, project_id, model_id, user_id, endpoint_name=None):
        """
        Deploy trained model to endpoint
        """
        if endpoint_name is None:
            endpoint_name = f"{user_id}-production"

        print(f"\nDeploying endpoint: {endpoint_name}")

        url = f"{self.base_url}/projects/{project_id}/endpoints"

        payload = {
            "name": endpoint_name,
            "description": f"Production endpoint for {user_id}",
            "modelId": model_id
        }

        response = requests.post(url, headers=self.headers, json=payload)

        if response.status_code in [200, 201]:
            endpoint_data = response.json()
            endpoint_id = endpoint_data["id"]
            print(f"✓ Endpoint deployed: {endpoint_id}")
            return endpoint_id
        else:
            print(f"✗ Error deploying endpoint: {response.status_code}")
            print(f"  Response: {response.text}")
            return None

    def process_user_full_pipeline(self, user_id, display_name, training_dir, wait_for_training=False):
        """
        Complete pipeline for one user: upload → create project → dataset → train
        """
        print(f"\n{'='*70}")
        print(f"FULL PIPELINE: {user_id}")
        print(f"{'='*70}")

        results = {
            "user_id": user_id,
            "display_name": display_name,
            "status": "started",
            "timestamp": datetime.now().isoformat()
        }

        # Step 1: Upload training data
        try:
            upload_result = self.upload_training_data(user_id, training_dir)
            results["upload"] = upload_result
        except Exception as e:
            print(f"✗ Upload failed: {e}")
            results["status"] = "upload_failed"
            return results

        # Step 2: Create project
        project_id = self.create_project(user_id, display_name)
        if not project_id:
            results["status"] = "project_creation_failed"
            return results
        results["project_id"] = project_id

        # Step 3: Create dataset
        dataset_id = self.create_dataset(
            project_id,
            user_id,
            upload_result["container_url"]
        )
        if not dataset_id:
            results["status"] = "dataset_creation_failed"
            return results
        results["dataset_id"] = dataset_id

        # Step 4: Wait for validation
        if not self.wait_for_dataset_validation(project_id, dataset_id):
            results["status"] = "validation_failed"
            return results

        # Step 5: Start training
        model_id = self.train_model(project_id, dataset_id, user_id)
        if not model_id:
            results["status"] = "training_start_failed"
            return results
        results["model_id"] = model_id

        # Step 6: Wait for training (optional)
        if wait_for_training:
            print(f"\nWaiting for training to complete (this takes 6-12 hours)...")
            print(f"You can cancel (Ctrl+C) and check status later with:")
            print(f"  python azure_voice_manager.py check-status {project_id} {model_id}")

            while True:
                status_info = self.check_training_status(project_id, model_id)
                status = status_info["status"]

                if status == "Succeeded":
                    print(f"\n✓ Training completed!")

                    # Auto-deploy endpoint
                    endpoint_id = self.deploy_endpoint(project_id, model_id, user_id)
                    results["endpoint_id"] = endpoint_id
                    results["status"] = "completed"
                    break
                elif status == "Failed":
                    print(f"\n✗ Training failed!")
                    results["status"] = "training_failed"
                    break

                print(f"  Training status: {status} (progress: {status_info.get('progress', 0)}%)", end='\r')
                time.sleep(60)  # Check every minute
        else:
            results["status"] = "training_in_progress"
            print(f"\n✓ Training started successfully!")
            print(f"\nTo check status later, run:")
            print(f"  python azure_voice_manager.py check-status {project_id} {model_id}")

        return results


def main():
    """CLI interface"""
    import argparse

    parser = argparse.ArgumentParser(description="Azure Custom Voice Manager")
    parser.add_argument('command', choices=[
        'upload',
        'create-project',
        'create-dataset',
        'train',
        'check-status',
        'deploy',
        'full-pipeline',
        'batch-process'
    ])
    parser.add_argument('--user-id', help="User identifier")
    parser.add_argument('--display-name', help="User display name")
    parser.add_argument('--training-dir', help="Path to training data directory")
    parser.add_argument('--project-id', help="Azure project ID")
    parser.add_argument('--dataset-id', help="Azure dataset ID")
    parser.add_argument('--model-id', help="Azure model ID")
    parser.add_argument('--env-file', default='.env.voice-cloning', help="Environment file")
    parser.add_argument('--wait', action='store_true', help="Wait for training to complete")
    parser.add_argument('--users-file', help="JSON file with multiple users")

    args = parser.parse_args()

    # Initialize manager
    manager = AzureVoiceManager(args.env_file)

    # Execute command
    if args.command == 'upload':
        if not args.user_id or not args.training_dir:
            print("Error: --user-id and --training-dir required")
            sys.exit(1)
        manager.upload_training_data(args.user_id, args.training_dir)

    elif args.command == 'create-project':
        if not args.user_id or not args.display_name:
            print("Error: --user-id and --display-name required")
            sys.exit(1)
        manager.create_project(args.user_id, args.display_name)

    elif args.command == 'train':
        if not args.project_id or not args.dataset_id or not args.user_id:
            print("Error: --project-id, --dataset-id, and --user-id required")
            sys.exit(1)
        manager.train_model(args.project_id, args.dataset_id, args.user_id)

    elif args.command == 'check-status':
        if not args.project_id or not args.model_id:
            print("Error: --project-id and --model-id required")
            sys.exit(1)
        status = manager.check_training_status(args.project_id, args.model_id)
        print(json.dumps(status, indent=2))

    elif args.command == 'deploy':
        if not args.project_id or not args.model_id or not args.user_id:
            print("Error: --project-id, --model-id, and --user-id required")
            sys.exit(1)
        manager.deploy_endpoint(args.project_id, args.model_id, args.user_id)

    elif args.command == 'full-pipeline':
        if not args.user_id or not args.display_name or not args.training_dir:
            print("Error: --user-id, --display-name, and --training-dir required")
            sys.exit(1)

        result = manager.process_user_full_pipeline(
            args.user_id,
            args.display_name,
            args.training_dir,
            wait_for_training=args.wait
        )

        print(f"\n{'='*70}")
        print(f"PIPELINE RESULT:")
        print(json.dumps(result, indent=2))
        print(f"{'='*70}")

    elif args.command == 'batch-process':
        if not args.users_file:
            print("Error: --users-file required (JSON with user configurations)")
            sys.exit(1)

        # Load users configuration
        with open(args.users_file, 'r') as f:
            users = json.load(f)

        results = []
        for user in users:
            result = manager.process_user_full_pipeline(
                user["user_id"],
                user["display_name"],
                user["training_dir"],
                wait_for_training=False
            )
            results.append(result)

        # Save results
        output_file = f"batch_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)

        print(f"\n✓ Batch processing complete. Results saved to: {output_file}")


if __name__ == "__main__":
    main()
