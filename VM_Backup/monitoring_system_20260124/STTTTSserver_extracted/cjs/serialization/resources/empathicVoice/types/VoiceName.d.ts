import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { VoiceProvider } from "./VoiceProvider.js";
export declare const VoiceName: core.serialization.ObjectSchema<serializers.empathicVoice.VoiceName.Raw, Hume.empathicVoice.VoiceName>;
export declare namespace VoiceName {
    interface Raw {
        name: string;
        provider?: VoiceProvider.Raw | null;
    }
}
