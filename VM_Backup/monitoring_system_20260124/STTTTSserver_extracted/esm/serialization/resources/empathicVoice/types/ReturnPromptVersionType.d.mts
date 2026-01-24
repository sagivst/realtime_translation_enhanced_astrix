import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ReturnPromptVersionType: core.serialization.Schema<serializers.empathicVoice.ReturnPromptVersionType.Raw, Hume.empathicVoice.ReturnPromptVersionType>;
export declare namespace ReturnPromptVersionType {
    type Raw = "FIXED" | "LATEST";
}
