import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Error_ } from "./Error_.js";
import { TlInferencePrediction } from "./TlInferencePrediction.js";
export declare const TlInferenceResults: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.TlInferenceResults.Raw, Hume.expressionMeasurement.batch.TlInferenceResults>;
export declare namespace TlInferenceResults {
    interface Raw {
        predictions: TlInferencePrediction.Raw[];
        errors: Error_.Raw[];
    }
}
