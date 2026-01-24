import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { AssistantInput } from "./AssistantInput.js";
import { PauseAssistantMessage } from "./PauseAssistantMessage.js";
import { ResumeAssistantMessage } from "./ResumeAssistantMessage.js";
import { SessionSettings } from "./SessionSettings.js";
import { ToolErrorMessage } from "./ToolErrorMessage.js";
import { ToolResponseMessage } from "./ToolResponseMessage.js";
import { UserInput } from "./UserInput.js";
export declare const ControlPlanePublishEvent: core.serialization.Schema<serializers.empathicVoice.ControlPlanePublishEvent.Raw, Hume.empathicVoice.ControlPlanePublishEvent>;
export declare namespace ControlPlanePublishEvent {
    type Raw = SessionSettings.Raw | UserInput.Raw | AssistantInput.Raw | ToolResponseMessage.Raw | ToolErrorMessage.Raw | PauseAssistantMessage.Raw | ResumeAssistantMessage.Raw;
}
