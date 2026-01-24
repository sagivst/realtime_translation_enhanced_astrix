import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { GroupedPredictionsBurstPrediction } from "./GroupedPredictionsBurstPrediction.js";
import { Null } from "./Null.js";
export declare const PredictionsOptionalNullBurstPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.PredictionsOptionalNullBurstPrediction.Raw, Hume.expressionMeasurement.batch.PredictionsOptionalNullBurstPrediction>;
export declare namespace PredictionsOptionalNullBurstPrediction {
    interface Raw {
        metadata?: Null.Raw | null;
        grouped_predictions: GroupedPredictionsBurstPrediction.Raw[];
    }
}
