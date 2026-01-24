import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { FacemeshPrediction } from "./FacemeshPrediction.mjs";
export declare const GroupedPredictionsFacemeshPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.GroupedPredictionsFacemeshPrediction.Raw, Hume.expressionMeasurement.batch.GroupedPredictionsFacemeshPrediction>;
export declare namespace GroupedPredictionsFacemeshPrediction {
    interface Raw {
        id: string;
        predictions: FacemeshPrediction.Raw[];
    }
}
