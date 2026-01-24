import type * as Hume from "../../../../../../../api/index.mjs";
import * as core from "../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../index.mjs";
export declare const PostedPromptVersion: core.serialization.Schema<serializers.empathicVoice.PostedPromptVersion.Raw, Hume.empathicVoice.PostedPromptVersion>;
export declare namespace PostedPromptVersion {
    interface Raw {
        text: string;
        version_description?: string | null;
    }
}
