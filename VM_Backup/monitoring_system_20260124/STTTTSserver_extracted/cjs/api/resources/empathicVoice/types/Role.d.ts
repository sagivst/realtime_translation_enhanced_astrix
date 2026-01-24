export declare const Role: {
    readonly Assistant: "assistant";
    readonly System: "system";
    readonly User: "user";
    readonly All: "all";
    readonly Tool: "tool";
    readonly Context: "context";
};
export type Role = (typeof Role)[keyof typeof Role];
