import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { Encoding } from "./Encoding.mjs";
export declare const ConnectSessionSettingsAudio: core.serialization.ObjectSchema<serializers.empathicVoice.ConnectSessionSettingsAudio.Raw, Hume.empathicVoice.ConnectSessionSettingsAudio>;
export declare namespace ConnectSessionSettingsAudio {
    interface Raw {
        channels?: number | null;
        encoding?: Encoding.Raw | null;
        sample_rate?: number | null;
    }
}
