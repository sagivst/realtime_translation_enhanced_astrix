import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { BurstPrediction } from "./BurstPrediction.mjs";
export declare const GroupedPredictionsBurstPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.GroupedPredictionsBurstPrediction.Raw, Hume.expressionMeasurement.batch.GroupedPredictionsBurstPrediction>;
export declare namespace GroupedPredictionsBurstPrediction {
    interface Raw {
        id: string;
        predictions: BurstPrediction.Raw[];
    }
}
