import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnBuiltinToolToolType } from "./ReturnBuiltinToolToolType.js";
export declare const ReturnBuiltinTool: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnBuiltinTool.Raw, Hume.empathicVoice.ReturnBuiltinTool>;
export declare namespace ReturnBuiltinTool {
    interface Raw {
        fallback_content?: string | null;
        name: string;
        tool_type: ReturnBuiltinToolToolType.Raw;
    }
}
