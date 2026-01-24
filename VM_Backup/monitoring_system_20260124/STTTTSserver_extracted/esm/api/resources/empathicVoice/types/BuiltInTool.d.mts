export declare const BuiltInTool: {
    readonly WebSearch: "web_search";
    readonly HangUp: "hang_up";
};
export type BuiltInTool = (typeof BuiltInTool)[keyof typeof BuiltInTool];
