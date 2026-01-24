import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { CompletedEmbeddingGeneration } from "./CompletedEmbeddingGeneration.js";
export declare const StateEmbeddingGenerationCompletedEmbeddingGeneration: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateEmbeddingGenerationCompletedEmbeddingGeneration.Raw, Hume.expressionMeasurement.batch.StateEmbeddingGenerationCompletedEmbeddingGeneration>;
export declare namespace StateEmbeddingGenerationCompletedEmbeddingGeneration {
    interface Raw extends CompletedEmbeddingGeneration.Raw {
    }
}
