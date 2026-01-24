import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const FormatPcm: core.serialization.ObjectSchema<serializers.tts.FormatPcm.Raw, Hume.tts.FormatPcm>;
export declare namespace FormatPcm {
    interface Raw {
        type: "pcm";
    }
}
