import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { FacemeshPrediction } from "./FacemeshPrediction.js";
export declare const GroupedPredictionsFacemeshPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.GroupedPredictionsFacemeshPrediction.Raw, Hume.expressionMeasurement.batch.GroupedPredictionsFacemeshPrediction>;
export declare namespace GroupedPredictionsFacemeshPrediction {
    interface Raw {
        id: string;
        predictions: FacemeshPrediction.Raw[];
    }
}
