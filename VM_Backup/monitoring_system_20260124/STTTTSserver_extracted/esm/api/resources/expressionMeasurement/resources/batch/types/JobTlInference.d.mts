import type * as Hume from "../../../../../index.mjs";
export interface JobTlInference {
    /** The ID associated with this job. */
    jobId: string;
    userId: string;
    request: Hume.expressionMeasurement.batch.TlInferenceBaseRequest;
    state: Hume.expressionMeasurement.batch.StateTlInference;
}
