import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { Encoding } from "./Encoding.js";
export declare const AudioConfiguration: core.serialization.ObjectSchema<serializers.empathicVoice.AudioConfiguration.Raw, Hume.empathicVoice.AudioConfiguration>;
export declare namespace AudioConfiguration {
    interface Raw {
        channels: number;
        codec?: string | null;
        encoding: Encoding.Raw;
        sample_rate: number;
    }
}
