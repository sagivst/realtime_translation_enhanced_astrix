/** Type of Tool. Either `BUILTIN` for natively implemented tools, like web search, or `FUNCTION` for user-defined tools. */
export declare const ReturnUserDefinedToolToolType: {
    readonly Builtin: "BUILTIN";
    readonly Function: "FUNCTION";
};
export type ReturnUserDefinedToolToolType = (typeof ReturnUserDefinedToolToolType)[keyof typeof ReturnUserDefinedToolToolType];
