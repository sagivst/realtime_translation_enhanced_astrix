import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnBuiltinToolToolType } from "./ReturnBuiltinToolToolType.mjs";
export declare const ReturnBuiltinTool: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnBuiltinTool.Raw, Hume.empathicVoice.ReturnBuiltinTool>;
export declare namespace ReturnBuiltinTool {
    interface Raw {
        fallback_content?: string | null;
        name: string;
        tool_type: ReturnBuiltinToolToolType.Raw;
    }
}
