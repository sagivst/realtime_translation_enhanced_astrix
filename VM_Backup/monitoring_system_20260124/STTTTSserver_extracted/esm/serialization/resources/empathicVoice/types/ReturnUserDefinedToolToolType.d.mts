import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ReturnUserDefinedToolToolType: core.serialization.Schema<serializers.empathicVoice.ReturnUserDefinedToolToolType.Raw, Hume.empathicVoice.ReturnUserDefinedToolToolType>;
export declare namespace ReturnUserDefinedToolToolType {
    type Raw = "BUILTIN" | "FUNCTION";
}
