import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const PostedConfigPromptSpec: core.serialization.ObjectSchema<serializers.empathicVoice.PostedConfigPromptSpec.Raw, Hume.empathicVoice.PostedConfigPromptSpec>;
export declare namespace PostedConfigPromptSpec {
    interface Raw {
        id?: string | null;
        text?: string | null;
        version?: number | null;
    }
}
