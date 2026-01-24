export declare const SortBy: {
    readonly Created: "created";
    readonly Started: "started";
    readonly Ended: "ended";
};
export type SortBy = (typeof SortBy)[keyof typeof SortBy];
