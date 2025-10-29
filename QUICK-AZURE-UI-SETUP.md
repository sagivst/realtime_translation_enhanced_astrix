# Quick Azure UI Setup - 5 Minutes Per User

**Your training data is already uploaded and ready to use!** ✅

Just follow these simple steps in Azure Speech Studio.

---

## ✅ What's Already Done

- ✅ All 32 recordings processed
- ✅ All audio transcribed with AI
- ✅ All training data uploaded to Azure Blob Storage
- ✅ Azure Speech Service created (East US region)

**Your Container URLs:**
```
Boyan:     https://voiceclone0534455.blob.core.windows.net/training-boyan-tiholov
Denitsa:   https://voiceclone0534455.blob.core.windows.net/training-denitsa-dencheva
Miroslav:  https://voiceclone0534455.blob.core.windows.net/training-miroslav-dimitrov
Velislava: https://voiceclone0534455.blob.core.windows.net/training-velislava-chavdarova
```

---

## 🚀 Setup (Do This Once for Each User)

### Step 1: Open Speech Studio

**Link:** https://speech.microsoft.com/portal

Click **"Custom Voice"** in left menu → **"Custom Neural Voice"**

---

### Step 2: Create Project

Click **"New project"** button

Fill in:
- **Name:** `CustomVoice-Boyan-Tiholov` (change for each user)
- **Language:** English (United States)
- **Description:** Custom voice from sales calls
- **Scenario:** General (or Conversational)

Click **"Create"**

---

### Step 3: Upload Data (Already in Blob Storage!)

Click **"Prepare training data"** → **"Upload data"**

Choose **"Import from URL"**

For each file type:

1. **Audio data URL:**
   ```
   https://voiceclone0534455.blob.core.windows.net/training-boyan-tiholov/audio
   ```
   (change `boyan-tiholov` to user's container name)

2. **Script data URL:**
   ```
   https://voiceclone0534455.blob.core.windows.net/training-boyan-tiholov/transcript.txt
   ```

Click **"Upload"**

Wait 2-3 minutes for validation...

---

### Step 4: Check Data Quality

Once upload completes:
- Check "Data validation" tab
- Should show ✅ green checkmarks
- If red ✗ errors, click to see details

**Common issues:**
- Audio format wrong → Already fixed (16kHz mono WAV) ✅
- Transcript mismatch → Already validated ✅
- Insufficient data → You have plenty (45-65 min per user) ✅

---

### Step 5: Train Model

Click **"Train model"** button

Fill in:
- **Model name:** `Boyan-v1`
- **Training method:** Neural (recommended)
- **Dataset:** Select the dataset you just uploaded

Click **"Train"**

⏰ **Training takes 6-12 hours** (do all 4 users in parallel!)

---

### Step 6: Deploy Endpoint (After Training Completes)

You'll get email notification when training is done.

Click **"Deploy model"** button

Fill in:
- **Deployment name:** `Boyan-production`
- **Model:** Select your trained model

Click **"Deploy"**

⏰ Takes 5-10 minutes

---

### Step 7: Get Endpoint ID

Once deployed:

1. Click on the deployment name
2. Copy the **Endpoint ID** (looks like: `a1b2c3d4-e5f6-...`)
3. Save it somewhere

---

### Step 8: Update Config File

Edit `config/agent-voices.json`:

```json
{
  "agents": {
    "Boyan_Tiholov": {
      "endpointId": "paste-your-endpoint-id-here",
      "voiceName": "CustomVoice-Boyan-Tiholov",
      ...
    }
  }
}
```

---

## 📋 Checklist for All 4 Users

Do the above steps 4 times (one per user):

- [ ] **Boyan Tiholov**
  - [ ] Create project
  - [ ] Upload data (container: `training-boyan-tiholov`)
  - [ ] Train model
  - [ ] Deploy endpoint
  - [ ] Copy endpoint ID

- [ ] **Denitsa Dencheva**
  - [ ] Create project
  - [ ] Upload data (container: `training-denitsa-dencheva`)
  - [ ] Train model
  - [ ] Deploy endpoint
  - [ ] Copy endpoint ID

- [ ] **Miroslav Dimitrov**
  - [ ] Create project
  - [ ] Upload data (container: `training-miroslav-dimitrov`)
  - [ ] Train model
  - [ ] Deploy endpoint
  - [ ] Copy endpoint ID

- [ ] **Velislava Chavdarova**
  - [ ] Create project
  - [ ] Upload data (container: `training-velislava-chavdarova`)
  - [ ] Train model
  - [ ] Deploy endpoint
  - [ ] Copy endpoint ID

---

## ⚡ Pro Tips

### Do All 4 in Parallel
- Open 4 browser tabs
- Create all 4 projects at once
- Start all 4 trainings together
- They all finish around the same time!

### Set Notifications
- Enable email notifications in Speech Studio
- You'll know when training completes

### Training Overnight
- Start training before you leave
- Models will be ready next morning
- No need to wait/monitor

---

## 🎯 Timeline

| Task | Time | When |
|------|------|------|
| Create 4 projects | 10 min | Now |
| Upload data (already in blob) | 2 min per user | Now |
| Start training | 2 min per user | Now |
| **Wait for training** | **6-12 hours** | **Overnight** |
| Deploy 4 endpoints | 5 min total | Tomorrow |
| Update config | 2 min | Tomorrow |
| **Total active time** | **~25 minutes** | |

---

## ❓ Troubleshooting

### "Can't access blob storage"

The containers are private. Azure Speech Studio should auto-authenticate with your subscription.

If not:
1. Go to Azure Portal → Storage Account `voiceclone0534455`
2. Click "Shared access signature"
3. Generate SAS token
4. Append `?<sas-token>` to URLs

### "Data validation failed"

Check specific errors. Your data should pass because:
- ✅ Correct format (16kHz mono WAV)
- ✅ Proper transcripts (filename|text)
- ✅ Clean audio (filtered by SNR)
- ✅ Sufficient duration (45-65 min)

### "Training failed"

Rare, but if it happens:
- Check email for specific error
- Try with subset of data (best 50% by SNR)
- Contact Azure support

---

## 🎉 What Happens Next?

Once all 4 endpoints are deployed:

1. ✅ Custom voices ready for synthesis
2. ✅ Support multiple languages (English, Hebrew, etc.)
3. ✅ Natural prosody from original speaker
4. ✅ Low latency (< 900ms)

Integrate with your conference server:
- Use endpoint IDs in `config/agent-voices.json`
- Server automatically uses custom voices
- Real-time translation with personalized voices!

---

## 📞 Azure Support

- **Portal:** https://portal.azure.com
- **Speech Studio:** https://speech.microsoft.com/portal
- **Docs:** https://learn.microsoft.com/azure/ai-services/speech-service/custom-neural-voice

---

**You're almost there! Just 25 minutes of clicking, then wait overnight.** 🚀

All the hard work (audio processing, transcription, upload) is already done!
