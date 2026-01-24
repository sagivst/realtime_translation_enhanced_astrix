export declare const ContextType: {
    readonly Persistent: "persistent";
    readonly Temporary: "temporary";
};
export type ContextType = (typeof ContextType)[keyof typeof ContextType];
