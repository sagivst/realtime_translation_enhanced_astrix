import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { FacePrediction } from "./FacePrediction.js";
export declare const GroupedPredictionsFacePrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.GroupedPredictionsFacePrediction.Raw, Hume.expressionMeasurement.batch.GroupedPredictionsFacePrediction>;
export declare namespace GroupedPredictionsFacePrediction {
    interface Raw {
        id: string;
        predictions: FacePrediction.Raw[];
    }
}
