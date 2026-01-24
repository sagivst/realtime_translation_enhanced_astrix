/** Versioning method for a Tool. Either `FIXED` for using a fixed version number or `LATEST` for auto-updating to the latest version. */
export declare const ReturnUserDefinedToolVersionType: {
    readonly Fixed: "FIXED";
    readonly Latest: "LATEST";
};
export type ReturnUserDefinedToolVersionType = (typeof ReturnUserDefinedToolVersionType)[keyof typeof ReturnUserDefinedToolVersionType];
