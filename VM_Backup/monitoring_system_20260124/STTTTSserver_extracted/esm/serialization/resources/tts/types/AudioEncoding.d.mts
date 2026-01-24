import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { AudioFormatType } from "./AudioFormatType.mjs";
export declare const AudioEncoding: core.serialization.ObjectSchema<serializers.tts.AudioEncoding.Raw, Hume.tts.AudioEncoding>;
export declare namespace AudioEncoding {
    interface Raw {
        format: AudioFormatType.Raw;
        sample_rate: number;
    }
}
