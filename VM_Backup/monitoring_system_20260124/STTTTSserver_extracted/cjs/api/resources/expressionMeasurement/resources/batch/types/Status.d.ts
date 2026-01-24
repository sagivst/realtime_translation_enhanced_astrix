export declare const Status: {
    readonly Queued: "QUEUED";
    readonly InProgress: "IN_PROGRESS";
    readonly Completed: "COMPLETED";
    readonly Failed: "FAILED";
};
export type Status = (typeof Status)[keyof typeof Status];
