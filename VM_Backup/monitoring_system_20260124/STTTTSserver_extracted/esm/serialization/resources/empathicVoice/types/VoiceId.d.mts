import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { VoiceProvider } from "./VoiceProvider.mjs";
export declare const VoiceId: core.serialization.ObjectSchema<serializers.empathicVoice.VoiceId.Raw, Hume.empathicVoice.VoiceId>;
export declare namespace VoiceId {
    interface Raw {
        id: string;
        provider?: VoiceProvider.Raw | null;
    }
}
