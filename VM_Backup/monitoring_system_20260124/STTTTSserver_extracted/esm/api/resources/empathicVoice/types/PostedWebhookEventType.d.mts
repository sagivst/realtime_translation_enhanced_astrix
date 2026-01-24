/** Events this URL is subscribed to */
export declare const PostedWebhookEventType: {
    readonly ChatStarted: "chat_started";
    readonly ChatEnded: "chat_ended";
    readonly ToolCall: "tool_call";
};
export type PostedWebhookEventType = (typeof PostedWebhookEventType)[keyof typeof PostedWebhookEventType];
