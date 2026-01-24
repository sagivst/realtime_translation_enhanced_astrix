import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ToolType: core.serialization.Schema<serializers.empathicVoice.ToolType.Raw, Hume.empathicVoice.ToolType>;
export declare namespace ToolType {
    type Raw = "builtin" | "function";
}
