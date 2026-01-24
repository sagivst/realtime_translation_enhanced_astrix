import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { JobEmbeddingGeneration } from "./JobEmbeddingGeneration.js";
export declare const EmbeddingGenerationJob: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.EmbeddingGenerationJob.Raw, Hume.expressionMeasurement.batch.EmbeddingGenerationJob>;
export declare namespace EmbeddingGenerationJob {
    interface Raw extends JobEmbeddingGeneration.Raw {
        type: string;
    }
}
