import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const TimestampType: core.serialization.Schema<serializers.tts.TimestampType.Raw, Hume.tts.TimestampType>;
export declare namespace TimestampType {
    type Raw = "word" | "phoneme";
}
