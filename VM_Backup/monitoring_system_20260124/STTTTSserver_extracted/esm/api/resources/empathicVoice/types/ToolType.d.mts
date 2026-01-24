export declare const ToolType: {
    readonly Builtin: "builtin";
    readonly Function: "function";
};
export type ToolType = (typeof ToolType)[keyof typeof ToolType];
