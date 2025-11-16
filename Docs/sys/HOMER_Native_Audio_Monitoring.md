
# 🎧 HOMER Native Audio Monitoring Reference (Technical Specification)

**Version:** 1.0  
**Target System:** AI-assisted Asterisk Voice Translation Pipeline  
**Author:** Engineering Spec (Sagiv Project)  
**Date:** November 2025  

---

## 🧠 1. Overview

HOMER (developed by **QXIP B.V.**, Amsterdam) is an **open-source, carrier-grade VoIP analytics suite**  
used globally for **RTP, RTCP, SIP, and WebRTC monitoring**.

In this system, HOMER serves as the **central observability hub** for all audio traffic  
passing through Asterisk and the AI Gateway, collecting:

- Packet-level and stream-level metrics  
- Codec and jitter analysis  
- MOS / R-Factor calculations  
- Delay, packet loss, and drift  
- Optional JSON telemetry for AI pipeline stages

---

## 🏗️ 2. High-Level Architecture

```mermaid
flowchart TD
    SIP1["SIP Endpoint / Mic 7000"]
    SIP2["SIP Endpoint / Mic 7001"]
    AST["Asterisk PBX (ExternalMedia)"]
    GW["AI Gateway (Node.js / RTP Processor)"]
    ASR["ASR (Deepgram)"]
    MT["MT (DeepL)"]
    TTS["TTS (ElevenLabs)"]
    LS["Latency Sync Engine"]
    HMON["HOMER / HEPlify Collector"]

    SIP1 --> AST --> GW
    GW --> ASR --> MT --> TTS --> LS --> AST
    AST --> SIP2

    AST -. RTP/RTCP Mirror .-> HMON
    GW -. HEP JSON (optional) .-> HMON
    LS -. RTP/RTCP Metrics .-> HMON


⸻

⚙️ 3. Core Components

Component	Role	Description
Asterisk PBX	Media Routing	Originates/receives SIP/RTP, exposes media via ExternalMedia
AI Gateway	Processing Layer	Handles audio in/out, feeds AI services (ASR/MT/TTS)
HEPlify Agent	RTP Capture	Listens on mirrored ports and sends HEP packets
HOMER Core (DB + UI)	Analytics	Correlates SIP/RTP/RTCP and visualizes call quality
RTCP Reports	Quality Feedback	Provide jitter, delay, MOS, and buffer information
HEPv3 Protocol	Telemetry Transport	Standard encapsulation for SIP/RTP/JSON events


⸻

🧩 4. Network & Capture Flow

sequenceDiagram
  participant A as SIP Endpoint (Mic)
  participant B as Asterisk
  participant C as AI Gateway
  participant D as HOMER / HEPlify

  A->>B: RTP (mic input)
  B->>C: RTP via ExternalMedia (uplink)
  C->>B: Translated RTP (downlink)
  B->>A: Mixed RTP output
  Note over B,D: RTCP reports mirrored to HOMER
  Note over C,D: Optional HEP JSON telemetry

HOMER sees both directions (uplink/downlink), computes MOS-LQO, R-Factor, and network impairments automatically.

⸻

🧮 5. Built-In Metrics per Stage (T0–T9)

Stage	Audio Flow	Metrics Captured Natively	Source	Notes
T0	Mic → Gateway	Jitter, packet loss, delay	RTP/RTCP	Base input quality
T1	Gateway → ASR	Same as above if mirrored	RTP	Mirror port recommended
T2–T4	ASR → MT → TTS	N/A (text domain)	—	No native audio
T5–T6	TTS → Gateway	MOS, R-Factor, delay	RTCP-XR	Evaluates TTS output audio
T7	Gateway → LS	Jitter, drift, delay	RTP	Analyzes sync deviation
T8	LS → Bridge	Jitter, delay, re-timestamp	RTP	Measures alignment
T9	Bridge → Endpoints	MOS, echo, loss	RTCP	User experience view


⸻

🧠 6. Metric Types Captured Automatically

Category	Metric	Computation Source	Description
Transport QoS	Packet Loss (%)	RTP sequence gaps	Lost RTP frames
	Jitter (ms)	RTCP timing variance	Timing irregularity
	Delay (ms)	RTCP timestamps	Network round-trip
Voice Quality	MOS-LQO	ITU-T G.107	Mean Opinion Score
	R-Factor	RTCP-XR	MOS correlation factor
Codec & Media	Codec type / change	SIP/SDP payload	Negotiated codec
	Bitrate (kbps)	RTP payload analysis	Effective stream rate
Error Detection	Duplicates	RTP sequence check	Retransmission noise
	Reordered Packets	RTP SSRC check	Mis-sequenced packets
Session Data	Duration, SIP IDs	SIP dialogs	Call reference linkage
	Correlation-ID	HEP headers	Unifies RTP/RTCP/SIP streams


⸻

🧰 7. Configuration Examples

(a) Enable HEP in Asterisk

[general]
enable_hep = yes
hep_server = 127.0.0.1
hep_port = 9060
capture_id = 2001

(b) Enable RTCP Reporting

[rtp]
rtcpinterval = 500

(c) Start HEPlify

heplify -i eth0 -h 127.0.0.1 -p 9060 -r yes

HEPlify passively captures mirrored traffic or direct HEP streams.

⸻

📊 8. HOMER Dashboards and Visuals

Dashboard	Purpose	Key Visuals
Call Flow	SIP ↔ RTP correlation	Topology, latency map
RTP Timeline	Per-stream packet view	Inter-arrival, gaps
MOS Distribution	Voice quality trends	Heatmap, per extension
RTCP Summary	End-to-end delay	Jitter, buffer, loss
Session Table	Global search	Call-ID, IP, codec, MOS

Example output:

Call: 7000 ↔ 7001
Codec: G.722
Upstream MOS: 4.3
Downstream MOS: 4.1
Avg Jitter: 7.5 ms
Packet Loss: 0.12%


⸻

🔬 9. Typical Data Flow with Monitoring

flowchart LR
    subgraph Media Flow
        A1["SIP Mic"]
        A2["Asterisk PBX"]
        A3["AI Gateway"]
        A4["TTS Engine"]
        A5["Bridge / Mix"]
    end

    subgraph Monitoring
        H1["HEPlify Agent"]
        H2["HOMER DB + UI"]
    end

    A1 --> A2 --> A3 --> A4 --> A5
    A2 -. RTP Mirror .-> H1
    A3 -. RTCP / HEP JSON .-> H1
    H1 --> H2


⸻

🧭 10. Deployment Reference

Prerequisites
	•	Linux host or VM for HOMER
	•	Port mirroring (SPAN) or direct HEP injection from Asterisk
	•	PostgreSQL + Grafana (optional)

Installation Quick Start

sudo apt install heplify heplify-server postgresql
sudo systemctl enable heplify
sudo systemctl start heplify

Access dashboard:
http://<server_ip>:9080

Default ports:
	•	HEP (UDP): 9060
	•	Web UI: 9080
	•	PostgreSQL: 5432

⸻

🧩 11. Example Integration Scenario (Asterisk + Gateway)

sequenceDiagram
  participant SIP as SIP Client
  participant AST as Asterisk (PBX)
  participant GW as AI Gateway
  participant HOM as HOMER

  SIP->>AST: INVITE / RTP
  AST->>GW: ExternalMedia stream (PCM16)
  GW->>AST: Processed RTP (translated)
  AST->>SIP: Mixed RTP playback
  AST->>HOM: RTP/RTCP mirrored packets
  GW->>HOM: Optional JSON telemetry


⸻

🚀 12. Built-In vs. Extendable Capabilities

Category	Native (Built-In)	Extendable (Later via HEP JSON)
Jitter / Packet Loss / Delay	✅	—
MOS / R-Factor / RTCP-XR	✅	—
Codec Negotiation / Bitrate	✅	—
LUFS / RMS / Loudness	❌	✅
STOI / PESQ / Intelligibility	❌	✅
ASR Confidence / MT Fluency	❌	✅
TTS Spectral Harshness	❌	✅
Sync Drift / Buffer Metrics	❌	✅


⸻

🔧 13. Future Extensions (Custom Metrics)

To expand monitoring beyond network-level analytics, your AI Gateway can emit
custom JSON HEP packets to port 9060 in this format:

{
  "type": "JSON",
  "correlation_id": "call-7000-7001",
  "payload": {
    "stage": "T6_TTS",
    "metrics": {
      "lufs": -20.5,
      "stoi": 0.88,
      "spectral_harshness": 0.12
    }
  }
}

These events appear inside HOMER dashboards alongside RTP statistics
and can be graphed, filtered, or exported for QA.

⸻

🧭 14. Summary
	•	HOMER natively measures transport and codec-level metrics — jitter, packet loss, MOS, delay.
	•	No code modifications are needed in Asterisk or the AI Gateway.
	•	HEPlify acts as a passive bridge between your RTP streams and HOMER DB.
	•	AI/Audio-specific metrics can be added gradually via JSON injection.

⸻

🔗 15. References
	•	Project Homepage: https://www.sipcapture.org
	•	GitHub Repo: https://github.com/sipcapture/homer
	•	Documentation: https://docs.sipcapture.org
	•	HEP Protocol Spec: https://github.com/sipcapture/hep

⸻

⚙️ HOMER Summary Chart

Feature	Description	Availability
RTP/RTCP Analytics	Jitter, loss, MOS, R-Factor	✅
SIP Correlation	Multi-leg tracking	✅
WebRTC Support	STUN/TURN awareness	✅
JSON Custom KPIs	AI telemetry injection	✅
ML Analysis (LUFS/STOI)	Optional extension	🔜
Grafana / API Export	Native integration	✅
Production Use Since	2011	🌍 Telecom-grade reliability





# 🧭 16. Full System Architecture Diagram (Horizontal Overview)

```mermaid
flowchart LR
    subgraph A1["Asterisk PBX Layer"]
        S1["SIP Endpoint 7000"]
        S2["SIP Endpoint 7001"]
        AST["Asterisk ExternalMedia Bridge"]
    end

    subgraph A2["AI Processing Layer (Gateway + AI Services)"]
        GW["AI Gateway (Node.js)"]
        ASR["ASR (Deepgram)"]
        MT["MT (DeepL)"]
        TTS["TTS (ElevenLabs)"]
        LS["Latency Sync (LS Engine)"]
    end

    subgraph A3["Monitoring & Analytics Layer"]
        HEP["HEPlify Agent"]
        HOMER["HOMER Core (DB + UI)"]
        GRAF["Grafana / API Export (Optional)"]
    end

    %% Connections
    S1 --> AST
    S2 --> AST
    AST --> GW
    GW --> ASR --> MT --> TTS --> LS --> AST
    AST --> S1
    AST --> S2

    %% Monitoring Feeds
    AST -. RTP/RTCP Mirroring .-> HEP
    GW -. HEP JSON Metrics .-> HEP
    LS -. RTCP/Sync Data .-> HEP
    HEP --> HOMER --> GRAF


⸻

🧱 17. Vertical Data Flow (End-to-End Stack)

graph TD
  A["T0 – Microphone Input (SIP Phone)"]
  B["T1 – Asterisk ExternalMedia (RTP Out)"]
  C["T2 – AI Gateway (Uplink Stream)"]
  D["T3 – ASR Processing (Deepgram)"]
  E["T4 – MT Translation (DeepL)"]
  F["T5 – TTS Rendering (ElevenLabs)"]
  G["T6 – Gateway Downlink"]
  H["T7 – Latency Sync Manager"]
  I["T8 – Asterisk Bridge (Softmix)"]
  J["T9 – Endpoint Playback (Translated Audio)"]
  K["HOMER + HEPlify (Monitoring)"]

  A --> B
  B --> C
  C --> D
  D --> E
  E --> F
  F --> G
  G --> H
  H --> I
  I --> J

  %% Monitoring Links
  B -. RTP & RTCP Mirror .-> K
  C -. HEP JSON Telemetry .-> K
  H -. Sync Metrics .-> K
  I -. RTCP Delay Stats .-> K
  J -. RTP Stream Summary .-> K


⸻

🔬 18. Monitoring Layer Breakdown (By Stage)

Stage	Audio Flow	Data Source	Metrics Captured by HOMER	Visualization
T0–T1	Mic → Gateway	RTP / RTCP	jitter, delay, loss, MOS	RTP timeline
T2–T4	ASR → MT → TTS	JSON (future)	N/A (AI layer only)	—
T5–T6	TTS → Gateway	RTP / RTCP-XR	MOS-LQO, bitrate, delay	MOS graph
T7	Gateway → LS	RTP (mirror)	jitter, drift	RTCP stats
T8–T9	LS → Bridge → SIP	RTCP summary	MOS, R-Factor, echo	Session view


⸻

🧩 19. Example Timeline View (Conceptual)

timeline
    title Audio Processing & Monitoring Stages (T0–T9)
    section Input
        T0: Microphone Capture
        T1: ExternalMedia Uplink
    section AI Processing
        T2: ASR Processing
        T3: MT Translation
        T4: TTS Rendering
    section Output
        T5: Gateway Downlink
        T6: Latency Sync
        T7: Bridge Mix
        T8: RTP Playback
        T9: HOMER Logging


⸻

📊 20. HOMER Metric Coverage Summary

Category	Collected Automatically	Requires JSON Extension	Description
RTP Packet Loss	✅	—	Sequence-based analysis
Jitter / Delay	✅	—	From RTCP reports
MOS-LQO / R-Factor	✅	—	G.107 formula
Codec Negotiation	✅	—	Extracted from SIP/SDP
Bandwidth Utilization	✅	—	Derived from RTP payloads
Loudness (LUFS)	❌	✅	Gateway DSP measurement
Speech Intelligibility (STOI)	❌	✅	AI-based analyzer
ASR Confidence	❌	✅	Deepgram API
TTS Harshness / Tone	❌	✅	ElevenLabs analysis
Sync Drift (ms)	Partial	✅	LS correlation delta


⸻

🧰 21. Recommended Configuration Topology

flowchart TB
    subgraph CLIENTS
        S1["SIP 7000"]
        S2["SIP 7001"]
    end
    subgraph ASTERISK
        BRIDGE["Bridge (Softmix)"]
        EXT["ExternalMedia"]
    end
    subgraph AI_GATEWAY
        PROC["Node.js AI Gateway"]
        SRV["ASR / MT / TTS"]
    end
    subgraph MONITORING
        HEP["HEPlify"]
        HOM["HOMER DB + UI"]
    end

    S1 --> EXT
    S2 --> EXT
    EXT --> PROC --> SRV --> EXT --> BRIDGE
    BRIDGE --> S1
    BRIDGE --> S2
    EXT -. RTP Mirror .-> HEP
    PROC -. HEP JSON .-> HEP
    HEP --> HOM


⸻

🧠 22. Notes on Performance and Scalability

Aspect	Recommendation	Reason
Latency Impact	<0.1% overhead	HOMER works in passive mode
Capture Mode	Port Mirroring (SPAN)	Non-intrusive
Storage	PostgreSQL / Elasticsearch	Scalable + queryable
Integration API	REST & WebSocket	Allows real-time quality alerts
Data Retention	7–30 days (recommended)	Rotate with Grafana/InfluxDB export
Performance Baseline	Up to 15k RTP streams/sec	Tested with HEPlify multi-core mode


⸻

🧩 23. Installation Overview (Technical)

Step 1: Install HEPlify

sudo apt install heplify heplify-server

Step 2: Enable RTP Mirroring

In /etc/asterisk/rtp.conf:

[general]
enable_hep = yes
hep_server = 127.0.0.1
hep_port = 9060
capture_id = 2001

Step 3: Verify Packet Flow

tcpdump -i any udp port 9060

You should see encapsulated HEP packets from Asterisk → HOMER.

Step 4: Access Dashboard

http://<server_ip>:9080
	•	Filter by Correlation-ID
	•	Drill into RTP Legs
	•	Observe MOS, Jitter, Packet Loss, Delay, Codec

⸻

🧭 24. Future Roadmap (Custom Telemetry)

Once native monitoring is stable, add custom metrics from AI stages:

Source	Metric	Format	Integration
Gateway DSP	LUFS / RMS	JSON	HEP JSON event
ASR	Confidence	JSON	per segment
MT	Translation latency	JSON	via API wrapper
TTS	Spectral harshness	JSON	per utterance
LS	Drift offset	JSON	per channel

Example JSON payload:

{
  "type": "JSON",
  "correlation_id": "call-xyz",
  "payload": {
    "stage": "T6_TTS",
    "metrics": {
      "lufs": -20.8,
      "harshness": 0.09,
      "confidence": 0.94
    }
  }
}


⸻

🧩 25. Key Takeaways
	•	HOMER + HEPlify provide a turnkey observability layer for VoIP and AI-driven pipelines.
	•	Full RTP/RTCP visibility without touching your media path.
	•	Immediate MOS, jitter, delay metrics per channel and bridge.
	•	Fully extensible for AI metrics (LUFS, STOI, confidence).
	•	Designed for Asterisk + ExternalMedia architectures — already tested in live environments.
	•	Used by Tier-1 telcos and enterprise contact centers for over a decade.

⸻

📘 References
	•	HOMER Official Site
	•	HEPlify Documentation
	•	HOMER Docs
	•	ITU-T G.107 MOS Reference
	•	Asterisk RTCP Configuration Guide

⸻

🧩 Conclusion
With this architecture, HOMER acts as the central nervous system of your translation pipeline —
observing every audio frame, correlating each leg, and providing engineers with the real-time clarity
needed to maintain pristine voice quality across languages, codecs, and AI modules.

