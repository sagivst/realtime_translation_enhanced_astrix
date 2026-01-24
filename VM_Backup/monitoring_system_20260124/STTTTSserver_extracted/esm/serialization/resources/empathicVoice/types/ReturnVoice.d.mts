import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { VoiceProvider } from "./VoiceProvider.mjs";
export declare const ReturnVoice: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnVoice.Raw, Hume.empathicVoice.ReturnVoice>;
export declare namespace ReturnVoice {
    interface Raw {
        compatible_octave_models?: string[] | null;
        id?: string | null;
        name?: string | null;
        provider?: VoiceProvider.Raw | null;
    }
}
