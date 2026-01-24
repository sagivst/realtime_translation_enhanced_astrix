import type * as Hume from "../../../index.mjs";
export interface VoiceId {
    /** ID of the voice in the `Voice Library`. */
    id: string;
    /** Model provider associated with this Voice ID. */
    provider?: Hume.empathicVoice.VoiceProvider;
}
