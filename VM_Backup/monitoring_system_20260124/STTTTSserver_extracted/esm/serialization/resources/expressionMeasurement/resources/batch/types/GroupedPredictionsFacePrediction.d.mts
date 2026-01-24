import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { FacePrediction } from "./FacePrediction.mjs";
export declare const GroupedPredictionsFacePrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.GroupedPredictionsFacePrediction.Raw, Hume.expressionMeasurement.batch.GroupedPredictionsFacePrediction>;
export declare namespace GroupedPredictionsFacePrediction {
    interface Raw {
        id: string;
        predictions: FacePrediction.Raw[];
    }
}
