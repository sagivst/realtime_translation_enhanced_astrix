/** Versioning method for a Prompt. Either `FIXED` for using a fixed version number or `LATEST` for auto-updating to the latest version. */
export declare const ReturnPromptVersionType: {
    readonly Fixed: "FIXED";
    readonly Latest: "LATEST";
};
export type ReturnPromptVersionType = (typeof ReturnPromptVersionType)[keyof typeof ReturnPromptVersionType];
