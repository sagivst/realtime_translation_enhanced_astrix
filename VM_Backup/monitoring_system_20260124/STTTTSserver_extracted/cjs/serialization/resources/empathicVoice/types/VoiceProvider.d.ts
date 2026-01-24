import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const VoiceProvider: core.serialization.Schema<serializers.empathicVoice.VoiceProvider.Raw, Hume.empathicVoice.VoiceProvider>;
export declare namespace VoiceProvider {
    type Raw = "HUME_AI" | "CUSTOM_VOICE";
}
