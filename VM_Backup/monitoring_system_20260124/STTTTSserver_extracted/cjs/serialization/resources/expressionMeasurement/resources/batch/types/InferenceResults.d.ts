import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Error_ } from "./Error_.js";
import { InferencePrediction } from "./InferencePrediction.js";
export declare const InferenceResults: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.InferenceResults.Raw, Hume.expressionMeasurement.batch.InferenceResults>;
export declare namespace InferenceResults {
    interface Raw {
        predictions: InferencePrediction.Raw[];
        errors: Error_.Raw[];
    }
}
