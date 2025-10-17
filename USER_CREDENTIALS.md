# 🔐 User Credentials - Real-Time Translation System

**Date Created:** 2025-10-16
**Server:** 4.185.84.26:5060
**Status:** ✅ Active and Configured

---

## 👤 User 1 - Primary Test Account

**Account Details:**
```
Username: user1
Password: Translation2025!
Server: 4.185.84.26
Port: 5060
Transport: UDP
Display Name: User 1 (English)
```

**Purpose:** Primary testing account for English speaker
**Status:** ✅ Configured and ready

---

## 👤 User 2 - Secondary Test Account

**Account Details:**
```
Username: user2
Password: RealTime2025!
Server: 4.185.84.26
Port: 5060
Transport: UDP
Display Name: User 2 (English)
```

**Purpose:** Secondary testing account for second participant
**Status:** ✅ Configured and ready

---

## 👤 User 3 - Additional Test Account

**Account Details:**
```
Username: user3
Password: MultiLang2025!
Server: 4.185.84.26
Port: 5060
Transport: UDP
Display Name: User 3 (Multi-Language)
```

**Purpose:** Optional third participant for multi-user testing
**Status:** ✅ Configured and ready

---

## 🔓 Guest Account (No Password)

**Account Details:**
```
Username: guest
Password: (none required)
Server: 4.185.84.26
Port: 5060
Transport: UDP
Display Name: Guest User
```

**Purpose:** Quick testing without authentication
**Status:** ✅ Configured and ready

---

## 📱 Softphone Configuration Guide

### Zoiper Configuration

**Step 1:** Download Zoiper
- Windows/Mac/Linux: https://www.zoiper.com/en/voip-softphone/download/current
- iOS/Android: Search "Zoiper" in app store

**Step 2:** Add Account
1. Open Zoiper
2. Click "Add Account" or "Settings"
3. Select "SIP Account"

**Step 3:** Enter User 1 Details
```
Account Name: Translation User 1
Username: user1
Password: Translation2025!
Domain: 4.185.84.26
Port: 5060 (default)
Transport: UDP
```

**Step 4:** Advanced Settings (Optional)
```
Outbound Proxy: (leave blank)
STUN Server: (leave blank or use default)
Codecs: Enable ulaw (G.711u) - move to top priority
```

**Step 5:** Save and Register
- Click "Save" or "Create Account"
- Status should change to "Registered" (green)

**Repeat for User 2** on a different device with user2 credentials

---

### Linphone Configuration

**Step 1:** Download Linphone
- All platforms: https://www.linphone.org/
- Open source alternative to Zoiper

**Step 2:** Create Account
1. Open Linphone
2. Go to "Settings" → "SIP Accounts"
3. Click "+" to add account

**Step 3:** Enter User 2 Details
```
Username: user2
Password: RealTime2025!
Domain: 4.185.84.26
Transport: UDP
Port: 5060
```

**Step 4:** Audio Settings
1. Go to "Settings" → "Audio"
2. Set codec priority: ulaw (G.711u) first
3. Enable echo cancellation

**Step 5:** Register
- Toggle "Enable" switch
- Status should show "Registered"

---

## 🎯 Quick Test Instructions

### Two English Users - Full Pipeline Test

**User 1 Setup:**
1. Configure SIP phone with user1 credentials
2. Register to 4.185.84.26:5060
3. Dial **1000** (translation conference)
4. Wait 3 seconds after answer tone

**User 2 Setup:**
1. Configure SIP phone with user2 credentials
2. Register to 4.185.84.26:5060
3. Dial **1000** (join same conference)
4. Wait 3 seconds after answer tone

**Test Conversation:**

**User 1 says:** "Hello, this is User One testing the system."
- **User 2 hears:** Synthesized English voice (1-2 second delay)
- **User 1 hears:** Nothing (mix-minus working)

**User 2 says:** "Hello User One, I can hear you clearly!"
- **User 1 hears:** Synthesized English voice (1-2 second delay)
- **User 2 hears:** Nothing (mix-minus working)

**Continue conversation:**
- Take turns speaking
- Wait 1-2 seconds between responses
- Verify voice quality is natural
- Verify no echo of own voice
- Test for 5-10 minutes

---

## 🎛️ Available Extensions

### Extension 100 - Echo Test
**Purpose:** Test SIP connectivity and audio quality
**Usage:** Dial 100, speak, hear your own voice echoed back
**Authentication:** Required (use credentials above)

### Extension 9000 - Standard Conference
**Purpose:** Multi-party conference without translation
**Usage:** Dial 9000, join conference, hear all participants
**Authentication:** Required (use credentials above)

### Extension 1000 - Translation Conference (MAIN)
**Purpose:** Real-time translation with emotion preservation
**Usage:** Dial 1000, speak in your language, hear others translated
**Authentication:** Required (use credentials above)

### Extensions 2000 & 3000 - Additional Conferences
**Purpose:** Separate translation rooms for different groups
**Usage:** Same as 1000, just different conference rooms
**Authentication:** Required (use credentials above)

---

## 🔍 Verification Steps

### After Configuration:

**Step 1: Verify Registration**
```bash
# SSH into Asterisk server (for admin only)
ssh azureuser@4.185.84.26
sudo asterisk -rx "pjsip show endpoints"
```

**Expected Output:**
```
Endpoint:  user1                                                Registered    0 of inf
     InAuth:  user1/user1
        Aor:  user1                                              5
      Contact:  user1/sip:user1@x.x.x.x:port                    Available
```

**Step 2: Test Echo (Extension 100)**
- Dial 100
- Speak clearly
- Hear immediate echo
- If successful: SIP authentication working ✅

**Step 3: Test Conference (Extension 9000)**
- Both users dial 9000
- Both speak and listen
- Both hear each other
- If successful: ConfBridge working ✅

**Step 4: Test Translation (Extension 1000)**
- Both users dial 1000
- Wait 3 seconds
- User 1 speaks
- User 2 hears synthesized voice
- If successful: Full pipeline working ✅

---

## 🐛 Troubleshooting

### "403 Forbidden" Error
**Cause:** Wrong password
**Fix:** Double-check password (case-sensitive!)
- user1: Translation2025!
- user2: RealTime2025!
- user3: MultiLang2025!

### "Registration Failed" Error
**Cause:** Network/firewall issue
**Fix:**
1. Verify server is reachable: `ping 4.185.84.26`
2. Check port 5060 UDP is open
3. Try disabling firewall temporarily
4. Check NAT settings in softphone

### "Not Registered" Status
**Cause:** Server unreachable or credentials incorrect
**Fix:**
1. Verify server IP: 4.185.84.26
2. Verify port: 5060
3. Verify username/password exactly as listed
4. Check internet connection

### Can't Dial Extensions
**Cause:** Not registered or wrong extension
**Fix:**
1. Ensure status shows "Registered"
2. Dial exactly: 100, 9000, or 1000
3. No prefix needed (no 1- or 9-)
4. Wait for dial tone before entering digits

---

## 📊 Monitoring Dashboard

**Access during your test:**
https://realtime-translation-1760218638.azurewebsites.net/monitoring-dashboard.html

**What to Watch:**
- **Active Participants:** Should show "2" when both users connected
- **Latency Graphs:** Should stay under 900ms
- **Service Status:** All indicators should be green
- **Translation Count:** Increments with each sentence
- **Frame Drops:** Should remain at 0%

---

## ✅ Success Criteria

Your test is successful when:

- ✅ Both users register with their credentials
- ✅ Both users can complete echo test (ext 100)
- ✅ Both users can join standard conference (ext 9000)
- ✅ Both users can join translation conference (ext 1000)
- ✅ Speech from User 1 → Synthesized voice heard by User 2
- ✅ Speech from User 2 → Synthesized voice heard by User 1
- ✅ Latency is 1-2 seconds consistently
- ✅ Voice quality is natural (not robotic)
- ✅ Mix-minus works (don't hear own voice)
- ✅ No audio artifacts or distortion
- ✅ Can hold 5+ minute conversation smoothly

---

## 🔒 Security Notes

**Production Recommendations:**
1. Change these default passwords before production use
2. Use stronger passwords (12+ characters, special characters)
3. Consider implementing TLS/SRTP for encrypted audio
4. Restrict SIP access by IP address if possible
5. Monitor for unauthorized registration attempts

**Current Setup:**
- Passwords are basic for testing purposes
- SIP is unencrypted (standard for testing)
- Server accepts connections from any IP
- Suitable for development/testing only

---

## 📞 Quick Reference Card

```
┌───────────────────────────────────────────────┐
│    REAL-TIME TRANSLATION SYSTEM v1.0          │
│         USER CREDENTIALS                      │
├───────────────────────────────────────────────┤
│  SERVER: 4.185.84.26:5060 (UDP)               │
├───────────────────────────────────────────────┤
│  USER 1:                                      │
│    Username: user1                            │
│    Password: Translation2025!                 │
├───────────────────────────────────────────────┤
│  USER 2:                                      │
│    Username: user2                            │
│    Password: RealTime2025!                    │
├───────────────────────────────────────────────┤
│  USER 3:                                      │
│    Username: user3                            │
│    Password: MultiLang2025!                   │
├───────────────────────────────────────────────┤
│  EXTENSIONS:                                  │
│    100  - Echo Test                           │
│    9000 - Standard Conference                 │
│    1000 - Translation Conference              │
├───────────────────────────────────────────────┤
│  SUPPORT:                                     │
│    Monitoring Dashboard:                      │
│    realtime-translation-1760218638            │
│    .azurewebsites.net/monitoring-dashboard    │
└───────────────────────────────────────────────┘
```

---

**Ready to Test!** 🚀

You now have everything needed to test the real-time translation system with 2 users speaking English through the complete pipeline (ASR → MT → TTS).

**Recommended First Test:**
1. Configure both users (user1 and user2)
2. Register both phones
3. Test echo (ext 100) on each
4. Test conference (ext 9000) with both
5. Test translation (ext 1000) with both
6. Have 5-minute conversation
7. Verify all success criteria above

**Questions?** Check the troubleshooting section or monitoring dashboard for real-time diagnostics.
