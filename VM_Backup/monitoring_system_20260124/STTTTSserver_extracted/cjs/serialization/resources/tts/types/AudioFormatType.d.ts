import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const AudioFormatType: core.serialization.Schema<serializers.tts.AudioFormatType.Raw, Hume.tts.AudioFormatType>;
export declare namespace AudioFormatType {
    type Raw = "mp3" | "pcm" | "wav";
}
