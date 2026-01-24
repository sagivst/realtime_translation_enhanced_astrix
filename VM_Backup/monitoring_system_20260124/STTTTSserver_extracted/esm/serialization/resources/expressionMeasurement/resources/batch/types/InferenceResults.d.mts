import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Error_ } from "./Error_.mjs";
import { InferencePrediction } from "./InferencePrediction.mjs";
export declare const InferenceResults: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.InferenceResults.Raw, Hume.expressionMeasurement.batch.InferenceResults>;
export declare namespace InferenceResults {
    interface Raw {
        predictions: InferencePrediction.Raw[];
        errors: Error_.Raw[];
    }
}
