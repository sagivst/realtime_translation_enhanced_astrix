import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { StateEmbeddingGenerationCompletedEmbeddingGeneration } from "./StateEmbeddingGenerationCompletedEmbeddingGeneration.mjs";
import { StateEmbeddingGenerationFailed } from "./StateEmbeddingGenerationFailed.mjs";
import { StateEmbeddingGenerationInProgress } from "./StateEmbeddingGenerationInProgress.mjs";
import { StateEmbeddingGenerationQueued } from "./StateEmbeddingGenerationQueued.mjs";
export declare const StateEmbeddingGeneration: core.serialization.Schema<serializers.expressionMeasurement.batch.StateEmbeddingGeneration.Raw, Hume.expressionMeasurement.batch.StateEmbeddingGeneration>;
export declare namespace StateEmbeddingGeneration {
    type Raw = StateEmbeddingGeneration.Queued | StateEmbeddingGeneration.InProgress | StateEmbeddingGeneration.Completed | StateEmbeddingGeneration.Failed;
    interface Queued extends StateEmbeddingGenerationQueued.Raw {
        status: "QUEUED";
    }
    interface InProgress extends StateEmbeddingGenerationInProgress.Raw {
        status: "IN_PROGRESS";
    }
    interface Completed extends StateEmbeddingGenerationCompletedEmbeddingGeneration.Raw {
        status: "COMPLETED";
    }
    interface Failed extends StateEmbeddingGenerationFailed.Raw {
        status: "FAILED";
    }
}
