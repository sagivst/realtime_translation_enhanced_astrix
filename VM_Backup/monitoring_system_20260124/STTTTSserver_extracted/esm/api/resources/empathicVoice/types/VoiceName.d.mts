import type * as Hume from "../../../index.mjs";
export interface VoiceName {
    /** Name of the voice in the `Voice Library`. */
    name: string;
    /** Model provider associated with this Voice Name. */
    provider?: Hume.empathicVoice.VoiceProvider;
}
