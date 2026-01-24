import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { CompletedEmbeddingGeneration } from "./CompletedEmbeddingGeneration.mjs";
export declare const StateEmbeddingGenerationCompletedEmbeddingGeneration: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateEmbeddingGenerationCompletedEmbeddingGeneration.Raw, Hume.expressionMeasurement.batch.StateEmbeddingGenerationCompletedEmbeddingGeneration>;
export declare namespace StateEmbeddingGenerationCompletedEmbeddingGeneration {
    interface Raw extends CompletedEmbeddingGeneration.Raw {
    }
}
