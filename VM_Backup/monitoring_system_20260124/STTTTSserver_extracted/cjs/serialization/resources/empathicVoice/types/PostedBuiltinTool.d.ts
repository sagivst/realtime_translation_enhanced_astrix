import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { PostedBuiltinToolName } from "./PostedBuiltinToolName.js";
export declare const PostedBuiltinTool: core.serialization.ObjectSchema<serializers.empathicVoice.PostedBuiltinTool.Raw, Hume.empathicVoice.PostedBuiltinTool>;
export declare namespace PostedBuiltinTool {
    interface Raw {
        fallback_content?: string | null;
        name: PostedBuiltinToolName.Raw;
    }
}
