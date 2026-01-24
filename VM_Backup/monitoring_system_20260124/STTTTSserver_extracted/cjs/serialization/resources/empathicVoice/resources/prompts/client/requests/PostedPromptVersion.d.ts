import type * as Hume from "../../../../../../../api/index.js";
import * as core from "../../../../../../../core/index.js";
import type * as serializers from "../../../../../../index.js";
export declare const PostedPromptVersion: core.serialization.Schema<serializers.empathicVoice.PostedPromptVersion.Raw, Hume.empathicVoice.PostedPromptVersion>;
export declare namespace PostedPromptVersion {
    interface Raw {
        text: string;
        version_description?: string | null;
    }
}
