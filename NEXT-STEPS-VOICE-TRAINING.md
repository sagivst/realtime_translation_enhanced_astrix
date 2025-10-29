# Next Steps: Azure Voice Training

## ✅ What's Been Done

1. ✅ Extracted all 4 user recordings
2. ✅ Converted GSM → WAV 16kHz
3. ✅ Transcribed with Whisper
4. ✅ Prepared Azure training datasets
5. ✅ Created Azure Storage Account

## 📋 Training Data Summary

Check: `voice-cloning-pipeline/data/training-sets/`

Each user has:
- `audio/` - Individual WAV files (16kHz, mono)
- `transcript.txt` - Text transcripts (filename|text format)

## 🚀 Next: Upload to Azure & Train

### Option A: Automated Upload (Recommended)

Run the upload script:

```bash
source venv-voice/bin/activate

# Upload all 4 users
for user in Boyan_Tiholov Denitsa_Dencheva Miroslav_Dimitrov Velislava_Chavdarova; do
    python3 voice-cloning-pipeline/scripts/upload_to_azure.py \
        --user-id "$user" \
        --training-dir "voice-cloning-pipeline/data/training-sets/$user" \
        --storage-account "$STORAGE_NAME" \
        --storage-key "$STORAGE_KEY"
done
```

### Option B: Manual Upload via Azure Portal

1. **Open Azure Portal:** https://portal.azure.com
2. **Navigate to Storage Account:** `voiceclone...`
3. **Upload for each user:**
   - Go to container: `training-<username>`
   - Upload `audio/` folder
   - Upload `transcript.txt`

### Step 2: Train in Azure Speech Studio

For EACH user:

1. **Open Speech Studio:** https://speech.microsoft.com/portal/customvoice

2. **Create Project:**
   - Click "Custom Neural Voice"
   - "New Project" → Name: `CustomVoice-<Username>`
   - Language: English (US)
   - Region: Germany West Central

3. **Add Dataset:**
   - "Training data" → "Upload data"
   - Select your storage container
   - Wait for validation (5-10 minutes)

4. **Train Model:**
   - "Train model" → Select dataset
   - Model name: `<Username>-v1`
   - Start training (6-12 hours)

5. **Deploy Endpoint:**
   - Once trained: "Deploy model"
   - Endpoint name: `<Username>-production`
   - Copy **Endpoint ID**

6. **Update Config:**
   - Edit `config/agent-voices.json`
   - Add your endpoint ID for each user

### Step 3: Test Synthesis

```bash
cd realtime-translation-enhanced
node scripts/test-voice-synthesis.js
```

### Step 4: Integrate with Conference Server

Update `conference-server.js` to use custom voices.
See: `AZURE-TTS-IMPLEMENTATION-PLAN.md` Phase 3.

## 📊 Training Timeline

| Step | Duration | Status |
|------|----------|--------|
| Data prep | ✅ Complete | Done |
| Upload to Azure | 30 min | Next |
| Azure validation | 10 min | Pending |
| Training (per user) | 6-12 hours | Pending |
| Deployment | 10 min | Pending |
| Testing | 30 min | Pending |

**Total:** ~1-2 days (mostly waiting for Azure training)

## 💡 Tips

- Train all 4 users in parallel (Azure allows multiple projects)
- Monitor training in Speech Studio
- Test each voice before full integration
- Keep endpoint IDs secure

## ⚠️ Troubleshooting

**If validation fails:**
- Check audio files are 16kHz, mono, WAV
- Verify transcript format: `filename|text`
- Ensure minimum 300 utterances per user

**If training fails:**
- Check you have enough utterances (20+ minutes)
- Verify audio quality is good
- Try with subset of best quality recordings

## 📞 Support

Check logs: `setup_4profiles_*.log`
Environment: `.env.voice-cloning`
