/** Events this URL is subscribed to */
export declare const ReturnWebhookEventType: {
    readonly ChatStarted: "chat_started";
    readonly ChatEnded: "chat_ended";
    readonly ToolCall: "tool_call";
};
export type ReturnWebhookEventType = (typeof ReturnWebhookEventType)[keyof typeof ReturnWebhookEventType];
