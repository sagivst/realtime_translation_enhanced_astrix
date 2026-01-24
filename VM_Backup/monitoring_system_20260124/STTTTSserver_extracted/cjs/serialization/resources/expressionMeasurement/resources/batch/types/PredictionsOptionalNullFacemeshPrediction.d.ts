import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { GroupedPredictionsFacemeshPrediction } from "./GroupedPredictionsFacemeshPrediction.js";
import { Null } from "./Null.js";
export declare const PredictionsOptionalNullFacemeshPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.PredictionsOptionalNullFacemeshPrediction.Raw, Hume.expressionMeasurement.batch.PredictionsOptionalNullFacemeshPrediction>;
export declare namespace PredictionsOptionalNullFacemeshPrediction {
    interface Raw {
        metadata?: Null.Raw | null;
        grouped_predictions: GroupedPredictionsFacemeshPrediction.Raw[];
    }
}
