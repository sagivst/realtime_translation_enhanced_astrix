export declare const WebhookEventChatStatus: {
    readonly Active: "ACTIVE";
    readonly UserEnded: "USER_ENDED";
    readonly UserTimeout: "USER_TIMEOUT";
    readonly InactivityTimeout: "INACTIVITY_TIMEOUT";
    readonly MaxDurationTimeout: "MAX_DURATION_TIMEOUT";
    readonly SilenceTimeout: "SILENCE_TIMEOUT";
    readonly Error: "ERROR";
};
export type WebhookEventChatStatus = (typeof WebhookEventChatStatus)[keyof typeof WebhookEventChatStatus];
