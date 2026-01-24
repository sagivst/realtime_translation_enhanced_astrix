import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { AudioFormatType } from "./AudioFormatType.js";
export declare const AudioEncoding: core.serialization.ObjectSchema<serializers.tts.AudioEncoding.Raw, Hume.tts.AudioEncoding>;
export declare namespace AudioEncoding {
    interface Raw {
        format: AudioFormatType.Raw;
        sample_rate: number;
    }
}
