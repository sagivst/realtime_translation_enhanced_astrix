export declare const When: {
    readonly CreatedBefore: "created_before";
    readonly CreatedAfter: "created_after";
};
export type When = (typeof When)[keyof typeof When];
