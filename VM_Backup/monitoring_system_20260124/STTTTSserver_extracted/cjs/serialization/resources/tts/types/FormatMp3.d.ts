import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const FormatMp3: core.serialization.ObjectSchema<serializers.tts.FormatMp3.Raw, Hume.tts.FormatMp3>;
export declare namespace FormatMp3 {
    interface Raw {
        type: "mp3";
    }
}
