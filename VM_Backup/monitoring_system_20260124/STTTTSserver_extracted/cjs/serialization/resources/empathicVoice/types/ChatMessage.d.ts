import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ChatMessageToolResult } from "./ChatMessageToolResult.js";
import { Role } from "./Role.js";
import { ToolCallMessage } from "./ToolCallMessage.js";
export declare const ChatMessage: core.serialization.ObjectSchema<serializers.empathicVoice.ChatMessage.Raw, Hume.empathicVoice.ChatMessage>;
export declare namespace ChatMessage {
    interface Raw {
        content?: string | null;
        role: Role.Raw;
        tool_call?: ToolCallMessage.Raw | null;
        tool_result?: ChatMessageToolResult.Raw | null;
    }
}
