import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const TimestampType: core.serialization.Schema<serializers.tts.TimestampType.Raw, Hume.tts.TimestampType>;
export declare namespace TimestampType {
    type Raw = "word" | "phoneme";
}
