import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { Encoding } from "./Encoding.js";
export declare const ConnectSessionSettingsAudio: core.serialization.ObjectSchema<serializers.empathicVoice.ConnectSessionSettingsAudio.Raw, Hume.empathicVoice.ConnectSessionSettingsAudio>;
export declare namespace ConnectSessionSettingsAudio {
    interface Raw {
        channels?: number | null;
        encoding?: Encoding.Raw | null;
        sample_rate?: number | null;
    }
}
