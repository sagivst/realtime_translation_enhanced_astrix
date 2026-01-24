import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { CompletedTlInference } from "./CompletedTlInference.js";
export declare const StateTlInferenceCompletedTlInference: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateTlInferenceCompletedTlInference.Raw, Hume.expressionMeasurement.batch.StateTlInferenceCompletedTlInference>;
export declare namespace StateTlInferenceCompletedTlInference {
    interface Raw extends CompletedTlInference.Raw {
    }
}
