import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const CompletedInference: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.CompletedInference.Raw, Hume.expressionMeasurement.batch.CompletedInference>;
export declare namespace CompletedInference {
    interface Raw {
        created_timestamp_ms: number;
        started_timestamp_ms: number;
        ended_timestamp_ms: number;
        num_predictions: number;
        num_errors: number;
    }
}
