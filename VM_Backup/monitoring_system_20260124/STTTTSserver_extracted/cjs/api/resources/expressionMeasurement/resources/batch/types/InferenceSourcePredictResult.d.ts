import type * as Hume from "../../../../../index.js";
export interface InferenceSourcePredictResult {
    source: Hume.expressionMeasurement.batch.Source;
    results?: Hume.expressionMeasurement.batch.InferenceResults;
    /** An error message. */
    error?: string;
}
