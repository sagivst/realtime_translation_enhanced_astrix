import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { EmbeddingGenerationBaseRequest } from "./EmbeddingGenerationBaseRequest.mjs";
import { StateEmbeddingGeneration } from "./StateEmbeddingGeneration.mjs";
export declare const JobEmbeddingGeneration: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.JobEmbeddingGeneration.Raw, Hume.expressionMeasurement.batch.JobEmbeddingGeneration>;
export declare namespace JobEmbeddingGeneration {
    interface Raw {
        job_id: string;
        user_id: string;
        request: EmbeddingGenerationBaseRequest.Raw;
        state: StateEmbeddingGeneration.Raw;
    }
}
