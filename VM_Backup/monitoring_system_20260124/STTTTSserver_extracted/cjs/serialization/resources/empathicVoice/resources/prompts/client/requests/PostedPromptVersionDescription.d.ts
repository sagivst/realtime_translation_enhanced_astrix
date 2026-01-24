import type * as Hume from "../../../../../../../api/index.js";
import * as core from "../../../../../../../core/index.js";
import type * as serializers from "../../../../../../index.js";
export declare const PostedPromptVersionDescription: core.serialization.Schema<serializers.empathicVoice.PostedPromptVersionDescription.Raw, Hume.empathicVoice.PostedPromptVersionDescription>;
export declare namespace PostedPromptVersionDescription {
    interface Raw {
        version_description?: string | null;
    }
}
