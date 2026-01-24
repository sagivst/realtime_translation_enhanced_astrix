export declare const WebhookEventChatStartType: {
    readonly NewChatGroup: "new_chat_group";
    readonly ResumedChatGroup: "resumed_chat_group";
};
export type WebhookEventChatStartType = (typeof WebhookEventChatStartType)[keyof typeof WebhookEventChatStartType];
