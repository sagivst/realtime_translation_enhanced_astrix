import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Error_ } from "./Error_.mjs";
import { TlInferencePrediction } from "./TlInferencePrediction.mjs";
export declare const TlInferenceResults: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.TlInferenceResults.Raw, Hume.expressionMeasurement.batch.TlInferenceResults>;
export declare namespace TlInferenceResults {
    interface Raw {
        predictions: TlInferencePrediction.Raw[];
        errors: Error_.Raw[];
    }
}
