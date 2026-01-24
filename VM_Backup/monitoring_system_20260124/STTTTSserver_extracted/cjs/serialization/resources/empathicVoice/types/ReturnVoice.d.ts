import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { VoiceProvider } from "./VoiceProvider.js";
export declare const ReturnVoice: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnVoice.Raw, Hume.empathicVoice.ReturnVoice>;
export declare namespace ReturnVoice {
    interface Raw {
        compatible_octave_models?: string[] | null;
        id?: string | null;
        name?: string | null;
        provider?: VoiceProvider.Raw | null;
    }
}
