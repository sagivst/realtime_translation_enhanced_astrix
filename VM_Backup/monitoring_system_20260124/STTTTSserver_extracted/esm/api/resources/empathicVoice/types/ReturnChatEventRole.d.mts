/**
 * The role of the entity which generated the Chat Event. There are four possible values:
 * - `USER`: The user, capable of sending user messages and interruptions.
 * - `AGENT`: The assistant, capable of sending agent messages.
 * - `SYSTEM`: The backend server, capable of transmitting errors.
 * - `TOOL`: The function calling mechanism.
 */
export declare const ReturnChatEventRole: {
    readonly User: "USER";
    readonly Agent: "AGENT";
    readonly System: "SYSTEM";
    readonly Tool: "TOOL";
};
export type ReturnChatEventRole = (typeof ReturnChatEventRole)[keyof typeof ReturnChatEventRole];
