import type * as Hume from "../../../../../../../api/index.js";
import * as core from "../../../../../../../core/index.js";
import type * as serializers from "../../../../../../index.js";
export declare const PostedPrompt: core.serialization.Schema<serializers.empathicVoice.PostedPrompt.Raw, Hume.empathicVoice.PostedPrompt>;
export declare namespace PostedPrompt {
    interface Raw {
        name: string;
        text: string;
        version_description?: string | null;
    }
}
