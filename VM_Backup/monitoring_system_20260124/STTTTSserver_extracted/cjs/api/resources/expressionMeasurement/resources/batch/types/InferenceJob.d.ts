import type * as Hume from "../../../../../index.js";
export interface InferenceJob extends Hume.expressionMeasurement.batch.JobInference {
    /**
     * Denotes the job type.
     *
     * Jobs created with the Expression Measurement API will have this field set to `INFERENCE`.
     */
    type: string;
}
