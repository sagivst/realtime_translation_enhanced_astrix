import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const FormatWav: core.serialization.ObjectSchema<serializers.tts.FormatWav.Raw, Hume.tts.FormatWav>;
export declare namespace FormatWav {
    interface Raw {
        type: "wav";
    }
}
