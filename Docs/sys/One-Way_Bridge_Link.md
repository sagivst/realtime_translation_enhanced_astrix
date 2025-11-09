

One-Way Bridge Link in Asterisk (Dialplan-Only Implementation)

Bridge 7004 passively monitors Bridge 7000

⸻

1️⃣ Objective

This configuration creates a one-way audio link between two existing bridges:
	•	Bridge 7000 → source (talking room)
	•	Bridge 7004 → listener (monitoring room)

When an endpoint joins Bridge 7004, Asterisk automatically initiates a Local Channel that connects to Bridge 7000, allowing Bridge 7004 to hear everything from Bridge 7000, while ensuring complete silence in the opposite direction (no audio from 7004 is sent back).

⸻

2️⃣ Technical Flow Overview

flowchart TD
    A[Extension 7004 joins Bridge_7004] --> B[Dialplan executes linking macro]
    B --> C[Local channel originates toward Bridge_7000]
    C --> D[Bridge() application joins target Bridge_7000]
    D --> E[MuteAudio(in) applied on the caller side]
    E --> F[One-way audio: 7000 → 7004]

Direction of media

Bridge_7000  --->  Bridge_7004
(no return audio)


⸻

3️⃣ Dialplan Logic

Context: main entry for extension 7004

When a caller (or process) dials 7004, they are first placed into Bridge 7004.
Immediately afterward, Asterisk originates an internal Local Channel toward Bridge 7000 and mutes the microphone on the caller side.

[room7004]
exten => 7004,1,NoOp(Participant joined Bridge_7004)
 same => n,Answer()
 same => n,Bridge(bridge-7004)
 same => n,Hangup()

Once the Bridge() app is running, a secondary process (or another part of the dialplan) executes the “link” context below.

⸻

Context: one-way bridge linking

This section establishes the connection from Bridge 7004 to Bridge 7000 via a Local Channel.

[link-bridges]
exten => 1,1,NoOp(Link Bridge 7004 → Bridge 7000 for listen-only)
 same => n,Dial(Local/bridge-7000@bridge-in,30,b(mute_in))
 same => n,Hangup()

	•	Local/bridge-7000@bridge-in — creates an internal channel that will run the bridge-in context.
	•	b(mute_in) — invokes the mute_in subroutine before audio flows, used to mute the outgoing (microphone) direction.

⸻

Context: target bridge entry point

The Local Channel above enters here and joins the source bridge (7000).

[bridge-in]
exten => bridge-7000,1,NoOp(Join target Bridge_7000)
 same => n,Bridge(bridge-7000)
 same => n,Hangup()

	•	This Bridge() application attaches the Local Channel into Bridge 7000, letting it receive audio from that bridge’s mix.
	•	Since the originating leg is muted (see below), this creates a one-directional audio path.

⸻

Macro: mute the incoming audio

The macro mute_in is executed on the caller side (the one coming from Bridge 7004) during the Dial() setup.
It mutes any audio going into the call (so the target bridge never hears it).

[mute_in]
exten => s,1,NoOp(Muting incoming audio from Bridge_7004 leg)
 same => n,MuteAudio(in)
 same => n,Return()

	•	MuteAudio(in) blocks all audio from this channel’s microphone.
	•	The channel still receives audio from the other side (Bridge 7000).

⸻

4️⃣ End-to-End Behavior

Component	Role	Audio Direction	Description
Bridge 7000	Source	Outbound only	Mixes active speakers; feeds listeners
Bridge 7004	Listener	Inbound only	Receives stream from 7000
Local Channel (Dial)	Transport	Unidirectional	Carries 7000 → 7004
MuteAudio(in)	Control	—	Ensures 7004 is silent upstream

Result: participants in Bridge 7004 can hear everything happening in Bridge 7000, but anything said in Bridge 7004 stays local and is not transmitted.

⸻

5️⃣ Notes & Best Practices
	1.	No ARI required – This is 100 % Dialplan-driven; Asterisk handles lifecycle automatically.
	2.	Avoid recursion – Never link two bridges in both directions with this method; it will cause an infinite audio loop.
	3.	Stable identifiers – Use constant bridge IDs (bridge-7000, bridge-7004) created via BridgeCreate() at system startup.
	4.	Timing – Trigger [link-bridges] only after both bridges exist and at least one participant is in each.
	5.	Cleanup – The Local Channel terminates automatically when either bridge empties or hangs up.
	6.	Latency – Internal Local Channels introduce only a few milliseconds of delay; practically real-time.

⸻

6️⃣ Testing Procedure
	1.	From the Asterisk CLI:

channel originate Local/1@link-bridges application Echo()

to simulate linking.

	2.	Place test calls into Bridge 7000 and Bridge 7004 and verify:
	•	Audio from 7000 is heard in 7004.
	•	Audio from 7004 does not appear in 7000.
	3.	Check console output:

-- Executing [1@link-bridges:1] NoOp("Local/1@link-bridges", "Link Bridge 7004 → Bridge 7000 for listen-only") in new stack
-- Executing [s@mute_in:1] MuteAudio("Local/bridge-7000@bridge-in-00000002;1", "in")
-- Channel joined 'bridge-7000'



⸻

7️⃣ Expected Outcome

Parameter	Value
Connection Type	Internal Local Channel
Directionality	One-way (7000 → 7004)
Latency	< 20 ms
Maintenance	Fully automatic
Resource Overhead	Minimal (one extra Local Channel)


⸻

✅ Conclusion

This Dialplan-only method is ideal for fixed, repeatable call flows where bridges are created and destroyed in a predictable manner.
It provides reliable, one-way audio mirroring with no need for ARI or external control logic.
