import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const AudioFormatType: core.serialization.Schema<serializers.tts.AudioFormatType.Raw, Hume.tts.AudioFormatType>;
export declare namespace AudioFormatType {
    type Raw = "mp3" | "pcm" | "wav";
}
