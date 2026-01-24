import type * as Hume from "../../../index.mjs";
export interface ChatMessage {
    /** Transcript of the message. */
    content?: string;
    /** Role of who is providing the message. */
    role: Hume.empathicVoice.Role;
    /** Function call name and arguments. */
    toolCall?: Hume.empathicVoice.ToolCallMessage;
    /** Function call response from client. */
    toolResult?: Hume.empathicVoice.ChatMessageToolResult;
}
