import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { Encoding } from "./Encoding.mjs";
export declare const AudioConfiguration: core.serialization.ObjectSchema<serializers.empathicVoice.AudioConfiguration.Raw, Hume.empathicVoice.AudioConfiguration>;
export declare namespace AudioConfiguration {
    interface Raw {
        channels: number;
        codec?: string | null;
        encoding: Encoding.Raw;
        sample_rate: number;
    }
}
