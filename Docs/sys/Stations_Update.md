# Audio Optimizer – Full Specification (Stations Updated)

## 1. Stations Overview (Corrected)

Below is the corrected list of stations.  
Only STATION_4, STATION_5, and STATION_6 are **not relevant** at this stage.  
All other stations are part of the active and expected pipeline.

---

### **STATION_1 – Asterisk PBX**
- Location: Initial call entry point  
- Function: PBX/SIP server; receives and forwards audio streams  
- Monitors: SIP signaling, RTP characteristics, initial audio quality

### **STATION_2 – Gateway RX (Receive)**
- Location: Gateway receiving audio from PBX  
- Function: Ingests RTP packets  
- Monitors: Packet integrity, jitter, buffer fill

### **STATION_3 – STTTTSserver Input**
- Location: Server audio input stage  
- Function: Passes audio into STT/TTS pipeline  
- Monitors: Pre‑processing quality, buffer state

---

### ❌ **NOT RELEVANT FOR NOW**
These exist in theory but not used in your actual flow:

#### **STATION_4 – Deepgram STT**
#### **STATION_5 – Translation**
#### **STATION_6 – TTS Processing**

---

### **STATION_7 – Gateway TX (Transmit)**
- Location: Gateway sending audio back toward PBX  
- Function: RTP output  
- Monitors: Output packet timing, jitter, underruns

### **STATION_9 – STTTTSserver Output**
- Location: TTS / ElevenLabs output  
- Function: Audio synthesis output  
- Monitors: synthesis_latency, synthesis_quality_score, output buffers

### **STATION_10 – Gateway Return**
- Location: Last step before PBX playback  
- Function: Receives processed audio and relays  
- Monitors: End‑to‑end latency, drift, buffer health

### **STATION_11 – Hume EVI (Emotion)**
- Location: Emotion‑analysis service  
- Function: Emotional features extraction from audio  
- Monitors: emotion scores, confidence

---

This corrected station list can now be fully integrated into the main MD spec when you approve.

