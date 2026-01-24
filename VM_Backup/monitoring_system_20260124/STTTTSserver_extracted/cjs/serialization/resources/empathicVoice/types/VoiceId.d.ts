import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { VoiceProvider } from "./VoiceProvider.js";
export declare const VoiceId: core.serialization.ObjectSchema<serializers.empathicVoice.VoiceId.Raw, Hume.empathicVoice.VoiceId>;
export declare namespace VoiceId {
    interface Raw {
        id: string;
        provider?: VoiceProvider.Raw | null;
    }
}
