import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const PostedConfigPromptSpec: core.serialization.ObjectSchema<serializers.empathicVoice.PostedConfigPromptSpec.Raw, Hume.empathicVoice.PostedConfigPromptSpec>;
export declare namespace PostedConfigPromptSpec {
    interface Raw {
        id?: string | null;
        text?: string | null;
        version?: number | null;
    }
}
