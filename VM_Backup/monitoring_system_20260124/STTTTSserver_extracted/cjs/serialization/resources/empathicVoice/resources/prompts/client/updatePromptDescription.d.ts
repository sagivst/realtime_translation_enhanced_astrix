import type * as Hume from "../../../../../../api/index.js";
import type * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { ReturnPrompt } from "../../../types/ReturnPrompt.js";
export declare const Response: core.serialization.Schema<serializers.empathicVoice.prompts.updatePromptDescription.Response.Raw, Hume.empathicVoice.ReturnPrompt | undefined>;
export declare namespace Response {
    type Raw = ReturnPrompt.Raw | null | undefined;
}
