#!/usr/bin/env python3
"""
Reference Optimizer (PULL, 5s buckets) – Python pseudo-code
Target API: http://20.170.155.53:3020

Core loop:
1) GET /api/traces/active
2) For each active trace + station: GET /api/optimizer/snapshot?limit=1&since_bucket_ts=...
3) Decide knob changes
4) POST /api/optimizer/knobs/apply (apply_at_bucket_ts = next bucket)
5) Verify on next bucket via snapshot (config_version + knobs_snapshot)
"""

import time
import uuid
import requests
from datetime import datetime, timezone, timedelta

API_BASE = "http://20.170.155.53:3020"
BUCKET_MS = 5000
POLL_SECONDS = 5.0

# -----------------------------
# Utility: time/bucket helpers
# -----------------------------
def now_utc():
    return datetime.now(timezone.utc)

def floor_to_bucket(ts: datetime, bucket_ms: int = BUCKET_MS) -> datetime:
    epoch_ms = int(ts.timestamp() * 1000)
    floored = (epoch_ms // bucket_ms) * bucket_ms
    return datetime.fromtimestamp(floored / 1000, tz=timezone.utc)

def next_bucket_ts(ts: datetime, bucket_ms: int = BUCKET_MS) -> datetime:
    return floor_to_bucket(ts, bucket_ms) + timedelta(milliseconds=bucket_ms)

def iso(ts: datetime) -> str:
    # Ensure millisecond precision, Z suffix
    return ts.isoformat(timespec="milliseconds").replace("+00:00", "Z")

# ----------------------------------------
# HTTP client (single-session, keepalive)
# ----------------------------------------
class ApiClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.s = requests.Session()
        self.s.headers.update({
            "Accept": "application/json",
            "User-Agent": "OptimizerReference/1.0"
            # If/when auth is enabled:
            # "Authorization": "Bearer <TOKEN>"
        })

    def get_active_traces(self):
        r = self.s.get(f"{self.base_url}/api/traces/active", timeout=5)
        r.raise_for_status()
        return r.json()

    def get_snapshot(self, trace_id: str, since_bucket_ts: str = None, limit: int = 1):
        params = {"trace_id": trace_id, "limit": limit}
        if since_bucket_ts:
            params["since_bucket_ts"] = since_bucket_ts
        r = self.s.get(f"{self.base_url}/api/optimizer/snapshot", params=params, timeout=10)
        r.raise_for_status()
        return r.json()

    def apply_knobs(self, trace_id: str, station_key: str, apply_at_bucket_ts: str, knobs: dict, reason: str):
        body = {
            "trace_id": trace_id,
            "station_key": station_key,
            "apply_at_bucket_ts": apply_at_bucket_ts,
            "idempotency_key": str(uuid.uuid4()),
            "source": "auto_optimizer",
            "reason": reason,
            "knobs": knobs
        }
        r = self.s.post(f"{self.base_url}/api/optimizer/knobs/apply", json=body, timeout=10)
        r.raise_for_status()
        return r.json()

# ----------------------------------------
# Decision policy (simple baseline)
# ----------------------------------------
def safe_get_metric(metrics_block: dict, tap: str, key: str):
    # metrics_block: {"PRE": {...}, "POST": {...}}
    try:
        return metrics_block[tap][key]
    except KeyError:
        return None

def decide_knobs(bucket_obj: dict) -> tuple[dict, str] | tuple[None, None]:
    """
    Returns:
      (knobs_to_apply, reason) or (None, None) if no change.

    This policy is intentionally simple:
    - If POST clipping_ratio avg > 0.001 => reduce input_gain_db by 1..3 dB
    - Else if POST rms_dbfs avg < target_low => increase input_gain_db by 1 dB (bounded)
    - Else no change

    Real implementation may use:
    - PRE vs POST deltas
    - SNR / silence / ZCR patterns
    - hysteresis and cooldown
    - multi-metric objective scoring
    """
    TARGET_RMS = -18.0
    RMS_DEADBAND = 2.0     # +/- 2 dB around target
    CLIP_BAD = 0.001       # 0.1% clipped samples (example threshold)

    station_key = bucket_obj["station_key"]
    knobs_snapshot = bucket_obj.get("knobs_snapshot", {}) or {}
    metrics = bucket_obj.get("metrics", {}) or {}

    post_clip = safe_get_metric(metrics, "POST", "pcm.clipping_ratio")
    post_rms  = safe_get_metric(metrics, "POST", "pcm.rms_dbfs")

    # If metrics missing, do nothing (optimizer must be safe)
    if not post_clip or not post_rms:
        return None, None

    clip_avg = float(post_clip.get("avg", 0.0) or 0.0)
    rms_avg  = float(post_rms.get("avg", 0.0) or 0.0)

    # Current knob value (effective snapshot)
    cur_gain = float(knobs_snapshot.get("pcm.input_gain_db", 0.0) or 0.0)

    # 1) Clipping protection: reduce gain
    if clip_avg > CLIP_BAD:
        # Reduce gain more aggressively if clipping is severe
        if clip_avg > 0.01:
            delta = -3.0
        elif clip_avg > 0.003:
            delta = -2.0
        else:
            delta = -1.0

        new_gain = clamp(cur_gain + delta, -60.0, 20.0)
        if new_gain != cur_gain:
            return (
                {"pcm.input_gain_db": new_gain},
                f"[{station_key}] Reduce input gain due to clipping (clip_avg={clip_avg:.6f})"
            )

    # 2) Level targeting: increase gain if too low (within safe bounds)
    if rms_avg < (TARGET_RMS - RMS_DEADBAND):
        new_gain = clamp(cur_gain + 1.0, -60.0, 20.0)
        if new_gain != cur_gain:
            return (
                {"pcm.input_gain_db": new_gain},
                f"[{station_key}] Increase input gain to reach target RMS (rms_avg={rms_avg:.2f} dBFS)"
            )

    # 3) If too loud but not clipping, small reduction
    if rms_avg > (TARGET_RMS + RMS_DEADBAND):
        new_gain = clamp(cur_gain - 1.0, -60.0, 20.0)
        if new_gain != cur_gain:
            return (
                {"pcm.input_gain_db": new_gain},
                f"[{station_key}] Decrease input gain to reach target RMS (rms_avg={rms_avg:.2f} dBFS)"
            )

    return None, None

def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

# ----------------------------------------
# State tracking (per trace/station)
# ----------------------------------------
class OptimizerState:
    def __init__(self):
        # last processed bucket per trace_id+station
        self.last_bucket_ts = {}   # (trace_id, station_key) -> iso bucket_ts
        # cooldown to avoid knob thrashing
        self.cooldown_until = {}   # (trace_id, station_key) -> datetime
        # last config_version seen
        self.last_config_version = {}  # (trace_id, station_key) -> int

    def key(self, trace_id, station_key):
        return (trace_id, station_key)

# ----------------------------------------
# Main loop
# ----------------------------------------
def main():
    api = ApiClient(API_BASE)
    st = OptimizerState()

    while True:
        loop_started = now_utc()
        try:
            active = api.get_active_traces()
            traces = active.get("active", []) if active.get("success") else []
        except Exception as e:
            # If discovery fails, wait and retry
            print(f"[ERR] traces/active failed: {e}")
            sleep_to_next_tick(loop_started)
            continue

        for t in traces:
            trace_id = t["trace_id"]
            stations = t.get("stations", [])
            if not stations:
                continue

            # Pull latest bucket for this trace
            # (Server may return multiple stations per response. If your snapshot is per-station,
            # call once per station. Here we assume snapshot returns per station in "buckets".)
            try:
                snap = api.get_snapshot(trace_id=trace_id, since_bucket_ts=None, limit=1)
                if not snap.get("success"):
                    continue
                buckets = snap.get("buckets", [])
            except Exception as e:
                print(f"[ERR] snapshot failed trace={trace_id}: {e}")
                continue

            for b in buckets:
                station_key = b["station_key"]
                if station_key not in stations:
                    continue  # only optimize declared stations for this trace

                k = st.key(trace_id, station_key)

                bucket_ts = b["bucket_ts"]
                if st.last_bucket_ts.get(k) == bucket_ts:
                    continue  # already processed

                # Cooldown: avoid toggling too fast
                cd = st.cooldown_until.get(k)
                if cd and now_utc() < cd:
                    st.last_bucket_ts[k] = bucket_ts
                    continue

                # Decide
                knobs_to_apply, reason = decide_knobs(b)

                # Always mark processed bucket
                st.last_bucket_ts[k] = bucket_ts

                if not knobs_to_apply:
                    continue

                # Apply at NEXT bucket boundary relative to current bucket_ts
                # (We schedule based on bucket_ts, not "now", for determinism)
                bt = datetime.fromisoformat(bucket_ts.replace("Z", "+00:00"))
                apply_ts = bt + timedelta(milliseconds=BUCKET_MS)
                apply_iso = iso(apply_ts)

                try:
                    res = api.apply_knobs(
                        trace_id=trace_id,
                        station_key=station_key,
                        apply_at_bucket_ts=apply_iso,
                        knobs=knobs_to_apply,
                        reason=reason
                    )
                    # Optional: store config_version for verification
                    if res.get("success") and res.get("accepted"):
                        st.last_config_version[k] = int(res.get("config_version", 0) or 0)
                        # cooldown for 2 buckets to reduce thrashing
                        st.cooldown_until[k] = now_utc() + timedelta(seconds=10)
                        print(f"[APPLY] trace={trace_id} station={station_key} at={apply_iso} knobs={knobs_to_apply} reason={reason}")
                    else:
                        print(f"[WARN] apply rejected trace={trace_id} station={station_key} res={res}")
                except Exception as e:
                    print(f"[ERR] apply failed trace={trace_id} station={station_key}: {e}")

        sleep_to_next_tick(loop_started)

def sleep_to_next_tick(loop_started: datetime):
    # Keep cadence ~5s. In production, align sleep to wall-clock bucket boundaries.
    elapsed = (now_utc() - loop_started).total_seconds()
    remain = max(0.0, POLL_SECONDS - elapsed)
    time.sleep(remain)

if __name__ == "__main__":
    main()