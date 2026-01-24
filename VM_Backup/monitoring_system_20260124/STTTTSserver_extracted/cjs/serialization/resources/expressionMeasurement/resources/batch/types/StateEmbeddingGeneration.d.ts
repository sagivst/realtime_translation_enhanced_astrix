import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { StateEmbeddingGenerationCompletedEmbeddingGeneration } from "./StateEmbeddingGenerationCompletedEmbeddingGeneration.js";
import { StateEmbeddingGenerationFailed } from "./StateEmbeddingGenerationFailed.js";
import { StateEmbeddingGenerationInProgress } from "./StateEmbeddingGenerationInProgress.js";
import { StateEmbeddingGenerationQueued } from "./StateEmbeddingGenerationQueued.js";
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
