import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnBuiltinTool } from "./ReturnBuiltinTool.mjs";
import { ReturnEllmModel } from "./ReturnEllmModel.mjs";
import { ReturnEventMessageSpecs } from "./ReturnEventMessageSpecs.mjs";
import { ReturnLanguageModel } from "./ReturnLanguageModel.mjs";
import { ReturnNudgeSpec } from "./ReturnNudgeSpec.mjs";
import { ReturnPrompt } from "./ReturnPrompt.mjs";
import { ReturnTimeoutSpecs } from "./ReturnTimeoutSpecs.mjs";
import { ReturnUserDefinedTool } from "./ReturnUserDefinedTool.mjs";
import { ReturnVoice } from "./ReturnVoice.mjs";
import { ReturnWebhookSpec } from "./ReturnWebhookSpec.mjs";
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
