import type * as Hume from "../../../../../index.mjs";
export interface TlInferenceResults {
    predictions: Hume.expressionMeasurement.batch.TlInferencePrediction[];
    errors: Hume.expressionMeasurement.batch.Error_[];
}
