import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { CompletedTlInference } from "./CompletedTlInference.mjs";
export declare const StateTlInferenceCompletedTlInference: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateTlInferenceCompletedTlInference.Raw, Hume.expressionMeasurement.batch.StateTlInferenceCompletedTlInference>;
export declare namespace StateTlInferenceCompletedTlInference {
    interface Raw extends CompletedTlInference.Raw {
    }
}
