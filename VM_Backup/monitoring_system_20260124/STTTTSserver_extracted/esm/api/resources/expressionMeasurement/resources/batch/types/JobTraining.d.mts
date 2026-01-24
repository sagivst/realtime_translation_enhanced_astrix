import type * as Hume from "../../../../../index.mjs";
export interface JobTraining {
    /** The ID associated with this job. */
    jobId: string;
    userId: string;
    request: Hume.expressionMeasurement.batch.TrainingBaseRequest;
    state: Hume.expressionMeasurement.batch.StateTraining;
}
