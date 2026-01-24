import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { AssistantInput } from "../../../types/AssistantInput.mjs";
import { AudioInput } from "../../../types/AudioInput.mjs";
import { PauseAssistantMessage } from "../../../types/PauseAssistantMessage.mjs";
import { ResumeAssistantMessage } from "../../../types/ResumeAssistantMessage.mjs";
import { SessionSettings } from "../../../types/SessionSettings.mjs";
import { ToolErrorMessage } from "../../../types/ToolErrorMessage.mjs";
import { ToolResponseMessage } from "../../../types/ToolResponseMessage.mjs";
import { UserInput } from "../../../types/UserInput.mjs";
export declare const PublishEvent: core.serialization.Schema<serializers.empathicVoice.PublishEvent.Raw, Hume.empathicVoice.PublishEvent>;
export declare namespace PublishEvent {
    type Raw = AudioInput.Raw | SessionSettings.Raw | UserInput.Raw | AssistantInput.Raw | ToolResponseMessage.Raw | ToolErrorMessage.Raw | PauseAssistantMessage.Raw | ResumeAssistantMessage.Raw;
}
