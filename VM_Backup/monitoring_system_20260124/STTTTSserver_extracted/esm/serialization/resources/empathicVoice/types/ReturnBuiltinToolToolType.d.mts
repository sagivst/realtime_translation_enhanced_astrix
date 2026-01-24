import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ReturnBuiltinToolToolType: core.serialization.Schema<serializers.empathicVoice.ReturnBuiltinToolToolType.Raw, Hume.empathicVoice.ReturnBuiltinToolToolType>;
export declare namespace ReturnBuiltinToolToolType {
    type Raw = "BUILTIN" | "FUNCTION";
}
