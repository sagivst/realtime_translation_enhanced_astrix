import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const VoiceProvider: core.serialization.Schema<serializers.empathicVoice.VoiceProvider.Raw, Hume.empathicVoice.VoiceProvider>;
export declare namespace VoiceProvider {
    type Raw = "HUME_AI" | "CUSTOM_VOICE";
}
