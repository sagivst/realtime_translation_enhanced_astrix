import type * as Hume from "../../../../../../../api/index.mjs";
import * as core from "../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../index.mjs";
import { PostedBuiltinTool } from "../../../../types/PostedBuiltinTool.mjs";
import { PostedConfigPromptSpec } from "../../../../types/PostedConfigPromptSpec.mjs";
import { PostedEllmModel } from "../../../../types/PostedEllmModel.mjs";
import { PostedEventMessageSpecs } from "../../../../types/PostedEventMessageSpecs.mjs";
import { PostedLanguageModel } from "../../../../types/PostedLanguageModel.mjs";
import { PostedNudgeSpec } from "../../../../types/PostedNudgeSpec.mjs";
import { PostedTimeoutSpecs } from "../../../../types/PostedTimeoutSpecs.mjs";
import { PostedUserDefinedToolSpec } from "../../../../types/PostedUserDefinedToolSpec.mjs";
import { PostedWebhookSpec } from "../../../../types/PostedWebhookSpec.mjs";
import { VoiceRef } from "../../../../types/VoiceRef.mjs";
export declare const PostedConfigVersion: core.serialization.Schema<serializers.empathicVoice.PostedConfigVersion.Raw, Hume.empathicVoice.PostedConfigVersion>;
export declare namespace PostedConfigVersion {
    interface Raw {
        builtin_tools?: (PostedBuiltinTool.Raw | null | undefined)[] | null;
        ellm_model?: PostedEllmModel.Raw | null;
        event_messages?: PostedEventMessageSpecs.Raw | null;
        evi_version: string;
        language_model?: PostedLanguageModel.Raw | null;
        nudges?: PostedNudgeSpec.Raw | null;
        prompt?: PostedConfigPromptSpec.Raw | null;
        timeouts?: PostedTimeoutSpecs.Raw | null;
        tools?: (PostedUserDefinedToolSpec.Raw | null | undefined)[] | null;
        version_description?: string | null;
        voice?: VoiceRef.Raw | null;
        webhooks?: (PostedWebhookSpec.Raw | null | undefined)[] | null;
    }
}
