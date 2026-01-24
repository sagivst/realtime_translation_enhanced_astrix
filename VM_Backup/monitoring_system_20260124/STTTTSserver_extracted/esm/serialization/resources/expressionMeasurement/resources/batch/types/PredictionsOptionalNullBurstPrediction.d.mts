import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { GroupedPredictionsBurstPrediction } from "./GroupedPredictionsBurstPrediction.mjs";
import { Null } from "./Null.mjs";
export declare const PredictionsOptionalNullBurstPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.PredictionsOptionalNullBurstPrediction.Raw, Hume.expressionMeasurement.batch.PredictionsOptionalNullBurstPrediction>;
export declare namespace PredictionsOptionalNullBurstPrediction {
    interface Raw {
        metadata?: Null.Raw | null;
        grouped_predictions: GroupedPredictionsBurstPrediction.Raw[];
    }
}
