import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { GroupedPredictionsFacePrediction } from "./GroupedPredictionsFacePrediction.js";
import { Null } from "./Null.js";
export declare const PredictionsOptionalNullFacePrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.PredictionsOptionalNullFacePrediction.Raw, Hume.expressionMeasurement.batch.PredictionsOptionalNullFacePrediction>;
export declare namespace PredictionsOptionalNullFacePrediction {
    interface Raw {
        metadata?: Null.Raw | null;
        grouped_predictions: GroupedPredictionsFacePrediction.Raw[];
    }
}
