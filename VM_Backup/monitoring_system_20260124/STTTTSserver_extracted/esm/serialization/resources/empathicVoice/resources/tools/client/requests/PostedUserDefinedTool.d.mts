import type * as Hume from "../../../../../../../api/index.mjs";
import * as core from "../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../index.mjs";
export declare const PostedUserDefinedTool: core.serialization.Schema<serializers.empathicVoice.PostedUserDefinedTool.Raw, Hume.empathicVoice.PostedUserDefinedTool>;
export declare namespace PostedUserDefinedTool {
    interface Raw {
        description?: string | null;
        fallback_content?: string | null;
        name: string;
        parameters: string;
        version_description?: string | null;
    }
}
