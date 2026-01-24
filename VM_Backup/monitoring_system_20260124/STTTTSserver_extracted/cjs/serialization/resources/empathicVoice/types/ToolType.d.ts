import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ToolType: core.serialization.Schema<serializers.empathicVoice.ToolType.Raw, Hume.empathicVoice.ToolType>;
export declare namespace ToolType {
    type Raw = "builtin" | "function";
}
