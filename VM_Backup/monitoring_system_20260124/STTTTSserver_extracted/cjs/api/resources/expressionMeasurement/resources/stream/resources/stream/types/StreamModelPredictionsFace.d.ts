import type * as Hume from "../../../../../../../index.js";
/**
 * Response for the facial expression emotion model.
 */
export interface StreamModelPredictionsFace {
    predictions?: Hume.expressionMeasurement.stream.StreamModelPredictionsFacePredictionsItem[];
}
