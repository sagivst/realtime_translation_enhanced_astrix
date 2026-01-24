import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { PostedBuiltinToolName } from "./PostedBuiltinToolName.mjs";
export declare const PostedBuiltinTool: core.serialization.ObjectSchema<serializers.empathicVoice.PostedBuiltinTool.Raw, Hume.empathicVoice.PostedBuiltinTool>;
export declare namespace PostedBuiltinTool {
    interface Raw {
        fallback_content?: string | null;
        name: PostedBuiltinToolName.Raw;
    }
}
