import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ChatMessageToolResult } from "./ChatMessageToolResult.mjs";
import { Role } from "./Role.mjs";
import { ToolCallMessage } from "./ToolCallMessage.mjs";
export declare const ChatMessage: core.serialization.ObjectSchema<serializers.empathicVoice.ChatMessage.Raw, Hume.empathicVoice.ChatMessage>;
export declare namespace ChatMessage {
    interface Raw {
        content?: string | null;
        role: Role.Raw;
        tool_call?: ToolCallMessage.Raw | null;
        tool_result?: ChatMessageToolResult.Raw | null;
    }
}
