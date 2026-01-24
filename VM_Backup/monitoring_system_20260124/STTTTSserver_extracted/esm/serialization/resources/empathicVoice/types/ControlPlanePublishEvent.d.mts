import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { AssistantInput } from "./AssistantInput.mjs";
import { PauseAssistantMessage } from "./PauseAssistantMessage.mjs";
import { ResumeAssistantMessage } from "./ResumeAssistantMessage.mjs";
import { SessionSettings } from "./SessionSettings.mjs";
import { ToolErrorMessage } from "./ToolErrorMessage.mjs";
import { ToolResponseMessage } from "./ToolResponseMessage.mjs";
import { UserInput } from "./UserInput.mjs";
export declare const ControlPlanePublishEvent: core.serialization.Schema<serializers.empathicVoice.ControlPlanePublishEvent.Raw, Hume.empathicVoice.ControlPlanePublishEvent>;
export declare namespace ControlPlanePublishEvent {
    type Raw = SessionSettings.Raw | UserInput.Raw | AssistantInput.Raw | ToolResponseMessage.Raw | ToolErrorMessage.Raw | PauseAssistantMessage.Raw | ResumeAssistantMessage.Raw;
}
