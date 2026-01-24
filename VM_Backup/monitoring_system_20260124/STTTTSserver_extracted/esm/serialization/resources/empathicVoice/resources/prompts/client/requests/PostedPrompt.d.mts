import type * as Hume from "../../../../../../../api/index.mjs";
import * as core from "../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../index.mjs";
export declare const PostedPrompt: core.serialization.Schema<serializers.empathicVoice.PostedPrompt.Raw, Hume.empathicVoice.PostedPrompt>;
export declare namespace PostedPrompt {
    interface Raw {
        name: string;
        text: string;
        version_description?: string | null;
    }
}
