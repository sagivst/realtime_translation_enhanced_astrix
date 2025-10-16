# Voice Cloning Automation System

**Fully automated voice profile management for Azure Custom Neural Voice**

This system handles the complete lifecycle of custom voice creation from sales call recordings to deployed endpoints - for multiple users in parallel.

---

## 🎯 What It Does

✅ **Automated Upload** - Uploads training data to Azure Blob Storage
✅ **Project Creation** - Creates Custom Voice projects via API
✅ **Batch Training** - Trains all users in parallel
✅ **Auto-Deploy** - Deploys endpoints when training completes
✅ **Status Monitoring** - Real-time training progress
✅ **Web Dashboard** - Visual interface for management
✅ **Config Updates** - Automatically updates config files with endpoint IDs

---

## 🚀 Quick Start

### 1. Train All 4 Users (One Command!)

```bash
cd voice-cloning-pipeline
./voice-manager train-all
```

This will:
- Upload all training data to Azure
- Create 4 Custom Voice projects
- Start training for all users in parallel
- Save results to `batch_training_results.json`

**Time:** 5-10 minutes to start, then 6-12 hours for Azure to train

---

### 2. Monitor Training & Auto-Deploy

```bash
./voice-manager monitor
```

This will:
- Check training status every 5 minutes
- Auto-deploy endpoints when training completes
- Update `config/agent-voices.json` with endpoint IDs
- Show real-time progress

Leave this running overnight - it handles everything automatically!

---

### 3. Web Dashboard (Optional)

```bash
./voice-manager dashboard
```

Then open: **http://localhost:5000**

Visual dashboard showing:
- Training progress for all users
- Status cards with real-time updates
- One-click actions (refresh, deploy, export)
- Auto-refresh every 30 seconds

---

## 📋 CLI Commands

| Command | Description |
|---------|-------------|
| `./voice-manager train-all` | Start batch training for all users |
| `./voice-manager monitor` | Monitor progress & auto-deploy |
| `./voice-manager status` | Quick status check |
| `./voice-manager dashboard` | Launch web interface |
| `./voice-manager export` | Export results to JSON |
| `./voice-manager help` | Show all commands |

---

## 🔧 Advanced Usage

### Train Single User

```bash
source ../venv-voice/bin/activate

python3 scripts/azure_voice_manager.py full-pipeline \
  --user-id "Boyan_Tiholov" \
  --display-name "Boyan Tiholov" \
  --training-dir "data/training-sets/Boyan_Tiholov"
```

### Check Specific User Status

```bash
python3 scripts/azure_voice_manager.py check-status \
  --project-id <project-id> \
  --model-id <model-id>
```

### Deploy Specific Endpoint

```bash
python3 scripts/azure_voice_manager.py deploy \
  --project-id <project-id> \
  --model-id <model-id> \
  --user-id "Boyan_Tiholov"
```

---

## 📁 File Structure

```
voice-cloning-pipeline/
├── voice-manager              # Main CLI tool
├── dashboard.py               # Web dashboard
├── scripts/
│   ├── azure_voice_manager.py      # Core automation library
│   ├── batch_train_all_users.py    # Batch processor
│   └── monitor_training.py         # Training monitor
├── data/
│   └── training-sets/              # Ready-to-upload datasets
│       ├── Boyan_Tiholov/
│       ├── Denitsa_Dencheva/
│       ├── Miroslav_Dimitrov/
│       └── Velislava_Chavdarova/
└── batch_training_results.json     # Training status & results
```

---

## 🔄 Complete Workflow

### Day 1: Start Training

```bash
# 1. Train all users (5-10 min)
./voice-manager train-all

# 2. Start monitor (leave running overnight)
./voice-manager monitor
```

### Day 2: Auto-Deployment

The monitor will automatically:
- Detect when training completes
- Deploy endpoints
- Update `config/agent-voices.json`

Check progress:
```bash
./voice-manager status
```

Or use the dashboard:
```bash
./voice-manager dashboard
# Open http://localhost:5000
```

### Day 3: Ready to Use!

All endpoint IDs are now in `config/agent-voices.json`:

```json
{
  "agents": {
    "Boyan_Tiholov": {
      "endpointId": "abc123...",
      "status": "deployed",
      "deployed_at": "2025-10-16T10:30:00"
    },
    ...
  }
}
```

---

## 📊 Batch Results Format

`batch_training_results.json`:

```json
[
  {
    "user_id": "Boyan_Tiholov",
    "display_name": "Boyan Tiholov",
    "status": "deployed",
    "project_id": "abc-123-def",
    "dataset_id": "xyz-456-ghi",
    "model_id": "model-789",
    "endpoint_id": "endpoint-012",
    "upload": {
      "container_url": "https://...",
      "audio_count": 7
    },
    "timestamp": "2025-10-15T16:28:03"
  },
  ...
]
```

---

## 🎯 Status States

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `upload_complete` | Data uploaded | Training starts automatically |
| `training_in_progress` | Training active (6-12 hours) | Wait or monitor |
| `completed` | Training done, ready to deploy | Run monitor to auto-deploy |
| `deployed` | Live and ready to use | Use in production! |
| `*_failed` | Something went wrong | Check Azure portal for details |

---

## 🛠️ Troubleshooting

### Training Fails Validation

**Issue:** Dataset validation fails in Azure

**Fix:**
1. Check `batch_training_results.json` for error details
2. Verify audio files are 16kHz, mono, WAV
3. Ensure transcript.txt format: `filename|text`
4. Minimum 300 utterances required

### Monitor Not Finding Results

**Issue:** `batch_training_results.json` not found

**Fix:**
```bash
# Make sure you ran train-all first
./voice-manager train-all

# Then start monitor
./voice-manager monitor
```

### Endpoint Not Updating Config

**Issue:** `config/agent-voices.json` not updated

**Fix:**
The monitor auto-updates config. Check:
```bash
cat config/agent-voices.json | grep endpointId
```

If still empty, manually update:
```json
{
  "agents": {
    "User_Name": {
      "endpointId": "paste-from-azure-portal"
    }
  }
}
```

---

## 🚀 Scaling to More Users

To add new users:

1. **Add recordings** to `data/training-sets/New_User/`
2. **Update** `scripts/batch_train_all_users.py`:

```python
users = [
    # ... existing users ...
    {
        "user_id": "New_User",
        "display_name": "New User Name",
        "training_dir": "voice-cloning-pipeline/data/training-sets/New_User"
    }
]
```

3. **Add to config** `config/agent-voices.json`:

```json
{
  "agents": {
    "New_User": {
      "voiceName": "CustomVoice-New-User",
      "endpointId": "",
      "language": "en-US",
      "displayName": "New User Name",
      ...
    }
  }
}
```

4. **Run batch training:**

```bash
./voice-manager train-all
```

---

## 📈 API Integration

### Python API

```python
from scripts.azure_voice_manager import AzureVoiceManager

manager = AzureVoiceManager('.env.voice-cloning')

# Train one user
result = manager.process_user_full_pipeline(
    user_id="New_User",
    display_name="New User",
    training_dir="path/to/training/data",
    wait_for_training=False
)

# Check status
status = manager.check_training_status(project_id, model_id)
print(status['status'])  # Running, Succeeded, Failed

# Deploy endpoint
endpoint_id = manager.deploy_endpoint(project_id, model_id, user_id)
```

### REST API (via Dashboard)

```bash
# Start dashboard
./voice-manager dashboard

# Then use API:
curl http://localhost:5000/api/status
curl -X POST http://localhost:5000/api/start-batch
curl http://localhost:5000/api/export
```

---

## ⚙️ Configuration

All settings in `.env.voice-cloning`:

```bash
# Azure credentials
AZURE_SPEECH_KEY=your_key
AZURE_SPEECH_REGION=germanywestcentral
AZURE_STORAGE_CONNECTION_STRING=your_storage_connection

# Project settings
PROJECT_DIR=/Users/.../realtime-translation-enhanced
PIPELINE_DIR=voice-cloning-pipeline
```

---

## 🎉 What's Different from Manual Process?

| Manual (Azure Portal) | Automated (This System) |
|----------------------|-------------------------|
| Upload each user manually | One command uploads all |
| Create 4 projects by hand | Auto-creates all projects |
| Wait and check portal | Auto-monitors & deploys |
| Copy endpoint IDs manually | Auto-updates config files |
| 2-3 hours of manual work | 5 minutes + overnight automation |

---

## 🔐 Security Notes

- API keys stored in `.env.voice-cloning` (gitignored)
- Blob storage containers are private
- Endpoint IDs are not sensitive (they're deployment URLs)
- Monitor runs locally, no external access needed

---

## 💡 Tips

✅ **Run monitor overnight** - Training takes 6-12 hours
✅ **Use dashboard for visualization** - Easier than CLI
✅ **Export results regularly** - Backup your progress
✅ **Train in parallel** - All 4 users train simultaneously
✅ **Monitor is resumable** - Can stop/start anytime

---

## 📞 Support

**Check logs:**
```bash
cat setup_4profiles_*.log
cat batch_training_results.json
```

**Common commands:**
```bash
./voice-manager status      # Quick status
./voice-manager dashboard   # Visual interface
./voice-manager help        # All commands
```

**Azure Portal:**
- Projects: https://speech.microsoft.com/portal/customvoice
- Storage: https://portal.azure.com

---

## ✅ Success Checklist

- [ ] Ran `./voice-manager train-all` successfully
- [ ] Started `./voice-manager monitor`
- [ ] Training shows as "in_progress" (check status)
- [ ] Monitor running overnight (or in background)
- [ ] Endpoint IDs appear in `config/agent-voices.json`
- [ ] Status shows "deployed" for all users
- [ ] Ready to integrate with conference server!

---

**Built for scale. Automated for efficiency. Ready for production.** 🚀
