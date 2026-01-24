import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { EmbeddingGenerationBaseRequest } from "./EmbeddingGenerationBaseRequest.js";
import { StateEmbeddingGeneration } from "./StateEmbeddingGeneration.js";
export declare const JobEmbeddingGeneration: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.JobEmbeddingGeneration.Raw, Hume.expressionMeasurement.batch.JobEmbeddingGeneration>;
export declare namespace JobEmbeddingGeneration {
    interface Raw {
        job_id: string;
        user_id: string;
        request: EmbeddingGenerationBaseRequest.Raw;
        state: StateEmbeddingGeneration.Raw;
    }
}
