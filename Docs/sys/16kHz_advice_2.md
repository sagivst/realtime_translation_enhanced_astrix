Critical Issue Found: RFC 3551 PT=10 Definition is INCORRECT
Your document states "PT=10 = L16 @ 16kHz" but RFC 3551 actually defines PT=10 as L16 @ 44.1kHz stereo. This is a significant error that will undermine your analysis during peer review.

However, your root cause diagnosis is still correct - the 3x slowdown suggests Asterisk is internally mapping PT=10 to 16kHz (likely to slin16) in your specific ExternalMedia context, even though RFC 3551 defines it as 44.1kHz.

Technical Feedback on Your Analysis
What's Correct:

The core reasoning is sound: static payload type mismatch causes wrong playback speed

PT=96 (dynamic payload type) is the right approach for non-standard 48kHz L16 audio

Your audio pipeline verification (48kHz throughout) is thorough

The math checks out: 48kHz data decoded at 16kHz = 3x slowdown

What Needs Verification:

Asterisk PT mapping: Run rtp set debug on in Asterisk CLI during a call to confirm what codec/rate Asterisk actually binds to PT=10 in your ExternalMedia setup

Packet capture: Use tcpdump/Wireshark to verify RTP timestamp increments (+960 for 20ms @ 48kHz) and confirm big-endian payload

Dynamic PT behavior: Verify your Asterisk version actually uses channel format (slin48) when PT=96 is received, rather than requiring explicit mapping

Potential Issues with PT=96 Solution:

If you ever bridge to SIP endpoints/trunks, you'll need SDP with a=rtpmap:96 L16/48000/1 - otherwise remote endpoints won't know how to decode PT=96

Ensure both gateway RTP sender AND receiver use PT=96 consistently

Verify no middleboxes block/drop unknown dynamic PTs

Recommended Testing Before Deployment
Add explicit logging on both sides after the change: PT value, timestamp increment, bytes per packet

Test both directions (7777→8888 and 8888→7777) for 1-2 minutes to check jitter buffer behavior

Verify no subtle resampling artifacts

Alternative Explanation to Consider
The 3x slowdown could also be caused by RTP timestamp clock-rate mismatch: if gateway increments timestamps for 48kHz clock (+960) but Asterisk assumes 16kHz clock, each packet appears as 60ms instead of 20ms → 3x slowdown. This would still be fixed by PT=96.

Bottom Line
Your proposed solution (PT=10 → PT=96) is correct, but update your documentation to reflect that RFC 3551 defines PT=10 as 44.1kHz, and explain that Asterisk appears to be mapping it to 16kHz internally in your specific context.


