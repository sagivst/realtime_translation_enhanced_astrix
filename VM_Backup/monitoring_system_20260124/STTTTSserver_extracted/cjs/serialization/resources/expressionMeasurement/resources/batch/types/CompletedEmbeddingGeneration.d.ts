import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const CompletedEmbeddingGeneration: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.CompletedEmbeddingGeneration.Raw, Hume.expressionMeasurement.batch.CompletedEmbeddingGeneration>;
export declare namespace CompletedEmbeddingGeneration {
    interface Raw {
        created_timestamp_ms: number;
        started_timestamp_ms: number;
        ended_timestamp_ms: number;
    }
}
