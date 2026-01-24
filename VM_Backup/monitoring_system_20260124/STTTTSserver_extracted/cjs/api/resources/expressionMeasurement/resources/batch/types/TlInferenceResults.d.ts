import type * as Hume from "../../../../../index.js";
export interface TlInferenceResults {
    predictions: Hume.expressionMeasurement.batch.TlInferencePrediction[];
    errors: Hume.expressionMeasurement.batch.Error_[];
}
