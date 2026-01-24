import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnBuiltinTool } from "./ReturnBuiltinTool.js";
import { ReturnEllmModel } from "./ReturnEllmModel.js";
import { ReturnEventMessageSpecs } from "./ReturnEventMessageSpecs.js";
import { ReturnLanguageModel } from "./ReturnLanguageModel.js";
import { ReturnNudgeSpec } from "./ReturnNudgeSpec.js";
import { ReturnPrompt } from "./ReturnPrompt.js";
import { ReturnTimeoutSpecs } from "./ReturnTimeoutSpecs.js";
import { ReturnUserDefinedTool } from "./ReturnUserDefinedTool.js";
import { ReturnVoice } from "./ReturnVoice.js";
import { ReturnWebhookSpec } from "./ReturnWebhookSpec.js";
export declare const ReturnConfig: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnConfig.Raw, Hume.empathicVoice.ReturnConfig>;
export declare namespace ReturnConfig {
    interface Raw {
        builtin_tools?: (ReturnBuiltinTool.Raw | null | undefined)[] | null;
        created_on?: number | null;
        ellm_model?: ReturnEllmModel.Raw | null;
        event_messages?: ReturnEventMessageSpecs.Raw | null;
        evi_version?: string | null;
        id?: string | null;
        language_model?: ReturnLanguageModel.Raw | null;
        modified_on?: number | null;
        name?: string | null;
        nudges?: ReturnNudgeSpec.Raw | null;
        prompt?: ReturnPrompt.Raw | null;
        timeouts?: ReturnTimeoutSpecs.Raw | null;
        tools?: (ReturnUserDefinedTool.Raw | null | undefined)[] | null;
        version?: number | null;
        version_description?: string | null;
        voice?: ReturnVoice.Raw | null;
        webhooks?: (ReturnWebhookSpec.Raw | null | undefined)[] | null;
    }
}
