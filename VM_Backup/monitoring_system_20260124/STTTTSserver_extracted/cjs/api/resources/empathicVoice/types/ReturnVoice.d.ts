import type * as Hume from "../../../index.js";
/**
 * An Octave voice available for text-to-speech
 */
export interface ReturnVoice {
    compatibleOctaveModels?: string[];
    id?: string;
    name?: string;
    provider?: Hume.empathicVoice.VoiceProvider;
}
