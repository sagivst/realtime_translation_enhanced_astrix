import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { AssistantEnd } from "./AssistantEnd.js";
import { AssistantMessage } from "./AssistantMessage.js";
import { AssistantProsody } from "./AssistantProsody.js";
import { AudioOutput } from "./AudioOutput.js";
import { ChatMetadata } from "./ChatMetadata.js";
import { ToolCallMessage } from "./ToolCallMessage.js";
import { ToolErrorMessage } from "./ToolErrorMessage.js";
import { ToolResponseMessage } from "./ToolResponseMessage.js";
import { UserInterruption } from "./UserInterruption.js";
import { UserMessage } from "./UserMessage.js";
import { WebSocketError } from "./WebSocketError.js";
export declare const SubscribeEvent: core.serialization.Schema<serializers.empathicVoice.SubscribeEvent.Raw, Hume.empathicVoice.SubscribeEvent>;
export declare namespace SubscribeEvent {
    type Raw = AssistantEnd.Raw | AssistantMessage.Raw | AssistantProsody.Raw | AudioOutput.Raw | ChatMetadata.Raw | WebSocketError.Raw | UserInterruption.Raw | UserMessage.Raw | ToolCallMessage.Raw | ToolResponseMessage.Raw | ToolErrorMessage.Raw;
}
