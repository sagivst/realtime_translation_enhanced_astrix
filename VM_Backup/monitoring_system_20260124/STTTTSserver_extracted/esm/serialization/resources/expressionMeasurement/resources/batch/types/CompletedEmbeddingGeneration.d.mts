import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const CompletedEmbeddingGeneration: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.CompletedEmbeddingGeneration.Raw, Hume.expressionMeasurement.batch.CompletedEmbeddingGeneration>;
export declare namespace CompletedEmbeddingGeneration {
    interface Raw {
        created_timestamp_ms: number;
        started_timestamp_ms: number;
        ended_timestamp_ms: number;
    }
}
