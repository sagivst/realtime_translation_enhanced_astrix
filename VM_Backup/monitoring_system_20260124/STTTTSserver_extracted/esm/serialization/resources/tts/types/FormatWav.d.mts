import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const FormatWav: core.serialization.ObjectSchema<serializers.tts.FormatWav.Raw, Hume.tts.FormatWav>;
export declare namespace FormatWav {
    interface Raw {
        type: "wav";
    }
}
