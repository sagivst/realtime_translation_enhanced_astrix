import type * as Hume from "../../../../../index.mjs";
export interface GroupedPredictionsFacemeshPrediction {
    /** An automatically generated label to identify individuals in your media file. Will be `unknown` if you have chosen to disable identification, or if the model is unable to distinguish between individuals. */
    id: string;
    predictions: Hume.expressionMeasurement.batch.FacemeshPrediction[];
}
