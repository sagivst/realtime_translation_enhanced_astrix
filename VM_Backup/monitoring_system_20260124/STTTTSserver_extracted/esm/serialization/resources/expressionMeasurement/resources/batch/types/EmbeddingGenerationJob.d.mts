import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { JobEmbeddingGeneration } from "./JobEmbeddingGeneration.mjs";
export declare const EmbeddingGenerationJob: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.EmbeddingGenerationJob.Raw, Hume.expressionMeasurement.batch.EmbeddingGenerationJob>;
export declare namespace EmbeddingGenerationJob {
    interface Raw extends JobEmbeddingGeneration.Raw {
        type: string;
    }
}
