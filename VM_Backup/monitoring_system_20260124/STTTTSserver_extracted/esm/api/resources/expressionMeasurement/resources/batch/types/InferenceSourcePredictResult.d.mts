import type * as Hume from "../../../../../index.mjs";
export interface InferenceSourcePredictResult {
    source: Hume.expressionMeasurement.batch.Source;
    results?: Hume.expressionMeasurement.batch.InferenceResults;
    /** An error message. */
    error?: string;
}
