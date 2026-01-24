import type * as Hume from "../../../../../index.mjs";
export interface JobInference {
    /** The ID associated with this job. */
    jobId: string;
    /** The request that initiated the job. */
    request: Hume.expressionMeasurement.batch.InferenceRequest;
    /** The current state of the job. */
    state: Hume.expressionMeasurement.batch.StateInference;
}
