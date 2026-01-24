import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ReturnPromptVersionType: core.serialization.Schema<serializers.empathicVoice.ReturnPromptVersionType.Raw, Hume.empathicVoice.ReturnPromptVersionType>;
export declare namespace ReturnPromptVersionType {
    type Raw = "FIXED" | "LATEST";
}
