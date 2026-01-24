import type * as Hume from "../../../../../../api/index.mjs";
import type * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { ReturnPrompt } from "../../../types/ReturnPrompt.mjs";
export declare const Response: core.serialization.Schema<serializers.empathicVoice.prompts.createPromptVersion.Response.Raw, Hume.empathicVoice.ReturnPrompt | undefined>;
export declare namespace Response {
    type Raw = ReturnPrompt.Raw | null | undefined;
}
