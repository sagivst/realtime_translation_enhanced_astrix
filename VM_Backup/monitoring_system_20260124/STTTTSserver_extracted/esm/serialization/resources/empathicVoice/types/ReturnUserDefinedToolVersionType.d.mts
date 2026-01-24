import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ReturnUserDefinedToolVersionType: core.serialization.Schema<serializers.empathicVoice.ReturnUserDefinedToolVersionType.Raw, Hume.empathicVoice.ReturnUserDefinedToolVersionType>;
export declare namespace ReturnUserDefinedToolVersionType {
    type Raw = "FIXED" | "LATEST";
}
