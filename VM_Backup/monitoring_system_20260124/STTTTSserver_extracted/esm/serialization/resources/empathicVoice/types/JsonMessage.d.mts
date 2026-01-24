import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { AssistantEnd } from "./AssistantEnd.mjs";
import { AssistantMessage } from "./AssistantMessage.mjs";
import { AssistantProsody } from "./AssistantProsody.mjs";
import { ChatMetadata } from "./ChatMetadata.mjs";
import { ToolCallMessage } from "./ToolCallMessage.mjs";
import { ToolErrorMessage } from "./ToolErrorMessage.mjs";
import { ToolResponseMessage } from "./ToolResponseMessage.mjs";
import { UserInterruption } from "./UserInterruption.mjs";
import { UserMessage } from "./UserMessage.mjs";
import { WebSocketError } from "./WebSocketError.mjs";
export declare const JsonMessage: core.serialization.Schema<serializers.empathicVoice.JsonMessage.Raw, Hume.empathicVoice.JsonMessage>;
export declare namespace JsonMessage {
    type Raw = AssistantEnd.Raw | AssistantMessage.Raw | AssistantProsody.Raw | ChatMetadata.Raw | WebSocketError.Raw | UserInterruption.Raw | UserMessage.Raw | ToolCallMessage.Raw | ToolResponseMessage.Raw | ToolErrorMessage.Raw;
}
