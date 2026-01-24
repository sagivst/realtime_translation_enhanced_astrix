import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { GroupedPredictionsFacePrediction } from "./GroupedPredictionsFacePrediction.mjs";
import { Null } from "./Null.mjs";
export declare const PredictionsOptionalNullFacePrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.PredictionsOptionalNullFacePrediction.Raw, Hume.expressionMeasurement.batch.PredictionsOptionalNullFacePrediction>;
export declare namespace PredictionsOptionalNullFacePrediction {
    interface Raw {
        metadata?: Null.Raw | null;
        grouped_predictions: GroupedPredictionsFacePrediction.Raw[];
    }
}
