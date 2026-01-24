import type * as Hume from "../../../../../../../api/index.mjs";
import * as core from "../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../index.mjs";
export declare const PostedPromptVersionDescription: core.serialization.Schema<serializers.empathicVoice.PostedPromptVersionDescription.Raw, Hume.empathicVoice.PostedPromptVersionDescription>;
export declare namespace PostedPromptVersionDescription {
    interface Raw {
        version_description?: string | null;
    }
}
