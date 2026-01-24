import type * as Hume from "../../../../../index.js";
export interface InferenceResults {
    predictions: Hume.expressionMeasurement.batch.InferencePrediction[];
    errors: Hume.expressionMeasurement.batch.Error_[];
}
