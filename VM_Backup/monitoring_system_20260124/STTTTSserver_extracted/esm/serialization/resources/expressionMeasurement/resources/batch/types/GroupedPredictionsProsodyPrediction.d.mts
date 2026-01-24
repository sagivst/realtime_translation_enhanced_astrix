import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { ProsodyPrediction } from "./ProsodyPrediction.mjs";
export declare const GroupedPredictionsProsodyPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.GroupedPredictionsProsodyPrediction.Raw, Hume.expressionMeasurement.batch.GroupedPredictionsProsodyPrediction>;
export declare namespace GroupedPredictionsProsodyPrediction {
    interface Raw {
        id: string;
        predictions: ProsodyPrediction.Raw[];
    }
}
