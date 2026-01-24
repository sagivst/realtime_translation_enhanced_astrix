import type * as Hume from "../../../../../../../api/index.js";
import * as core from "../../../../../../../core/index.js";
import type * as serializers from "../../../../../../index.js";
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
