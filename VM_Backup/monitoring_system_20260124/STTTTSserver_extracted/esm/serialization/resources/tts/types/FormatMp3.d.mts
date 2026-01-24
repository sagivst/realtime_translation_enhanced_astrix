import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const FormatMp3: core.serialization.ObjectSchema<serializers.tts.FormatMp3.Raw, Hume.tts.FormatMp3>;
export declare namespace FormatMp3 {
    interface Raw {
        type: "mp3";
    }
}
