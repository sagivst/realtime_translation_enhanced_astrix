import type * as Hume from "../../../../../../../index.mjs";
/**
 * Response for the facial expression emotion model.
 */
export interface StreamModelPredictionsFace {
    predictions?: Hume.expressionMeasurement.stream.StreamModelPredictionsFacePredictionsItem[];
}
