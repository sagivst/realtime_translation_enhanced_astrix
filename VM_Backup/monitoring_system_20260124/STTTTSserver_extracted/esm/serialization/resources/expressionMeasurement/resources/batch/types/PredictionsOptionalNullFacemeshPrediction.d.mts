import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { GroupedPredictionsFacemeshPrediction } from "./GroupedPredictionsFacemeshPrediction.mjs";
import { Null } from "./Null.mjs";
export declare const PredictionsOptionalNullFacemeshPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.PredictionsOptionalNullFacemeshPrediction.Raw, Hume.expressionMeasurement.batch.PredictionsOptionalNullFacemeshPrediction>;
export declare namespace PredictionsOptionalNullFacemeshPrediction {
    interface Raw {
        metadata?: Null.Raw | null;
        grouped_predictions: GroupedPredictionsFacemeshPrediction.Raw[];
    }
}
