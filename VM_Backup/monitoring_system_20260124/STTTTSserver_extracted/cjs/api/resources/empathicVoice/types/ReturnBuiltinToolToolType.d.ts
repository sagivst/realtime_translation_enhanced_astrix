/** Type of Tool. Either `BUILTIN` for natively implemented tools, like web search, or `FUNCTION` for user-defined tools. */
export declare const ReturnBuiltinToolToolType: {
    readonly Builtin: "BUILTIN";
    readonly Function: "FUNCTION";
};
export type ReturnBuiltinToolToolType = (typeof ReturnBuiltinToolToolType)[keyof typeof ReturnBuiltinToolToolType];
