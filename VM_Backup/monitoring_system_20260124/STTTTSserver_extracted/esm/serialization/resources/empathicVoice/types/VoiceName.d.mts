import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { VoiceProvider } from "./VoiceProvider.mjs";
export declare const VoiceName: core.serialization.ObjectSchema<serializers.empathicVoice.VoiceName.Raw, Hume.empathicVoice.VoiceName>;
export declare namespace VoiceName {
    interface Raw {
        name: string;
        provider?: VoiceProvider.Raw | null;
    }
}
