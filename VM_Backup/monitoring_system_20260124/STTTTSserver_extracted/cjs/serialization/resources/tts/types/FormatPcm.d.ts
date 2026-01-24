import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const FormatPcm: core.serialization.ObjectSchema<serializers.tts.FormatPcm.Raw, Hume.tts.FormatPcm>;
export declare namespace FormatPcm {
    interface Raw {
        type: "pcm";
    }
}
