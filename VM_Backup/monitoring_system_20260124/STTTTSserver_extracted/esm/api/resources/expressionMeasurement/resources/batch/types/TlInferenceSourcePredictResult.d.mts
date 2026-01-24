import type * as Hume from "../../../../../index.mjs";
export interface TlInferenceSourcePredictResult {
    source: Hume.expressionMeasurement.batch.Source;
    results?: Hume.expressionMeasurement.batch.TlInferenceResults;
    /** An error message. */
    error?: string;
}
