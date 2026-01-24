import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
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
