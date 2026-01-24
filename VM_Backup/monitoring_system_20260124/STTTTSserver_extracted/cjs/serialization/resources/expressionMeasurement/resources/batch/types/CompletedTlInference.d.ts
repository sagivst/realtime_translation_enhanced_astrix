import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const CompletedTlInference: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.CompletedTlInference.Raw, Hume.expressionMeasurement.batch.CompletedTlInference>;
export declare namespace CompletedTlInference {
    interface Raw {
        created_timestamp_ms: number;
        started_timestamp_ms: number;
        ended_timestamp_ms: number;
        num_predictions: number;
        num_errors: number;
    }
}
