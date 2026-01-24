import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { BurstPrediction } from "./BurstPrediction.js";
export declare const GroupedPredictionsBurstPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.GroupedPredictionsBurstPrediction.Raw, Hume.expressionMeasurement.batch.GroupedPredictionsBurstPrediction>;
export declare namespace GroupedPredictionsBurstPrediction {
    interface Raw {
        id: string;
        predictions: BurstPrediction.Raw[];
    }
}
