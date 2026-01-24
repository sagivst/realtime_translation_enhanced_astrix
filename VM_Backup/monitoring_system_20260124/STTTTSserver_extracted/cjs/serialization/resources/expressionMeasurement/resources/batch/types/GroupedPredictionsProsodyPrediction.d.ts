import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { ProsodyPrediction } from "./ProsodyPrediction.js";
export declare const GroupedPredictionsProsodyPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.GroupedPredictionsProsodyPrediction.Raw, Hume.expressionMeasurement.batch.GroupedPredictionsProsodyPrediction>;
export declare namespace GroupedPredictionsProsodyPrediction {
    interface Raw {
        id: string;
        predictions: ProsodyPrediction.Raw[];
    }
}
