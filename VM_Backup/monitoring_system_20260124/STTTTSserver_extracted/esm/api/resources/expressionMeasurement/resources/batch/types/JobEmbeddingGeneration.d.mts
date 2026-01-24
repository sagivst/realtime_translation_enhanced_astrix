import type * as Hume from "../../../../../index.mjs";
export interface JobEmbeddingGeneration {
    /** The ID associated with this job. */
    jobId: string;
    userId: string;
    request: Hume.expressionMeasurement.batch.EmbeddingGenerationBaseRequest;
    state: Hume.expressionMeasurement.batch.StateEmbeddingGeneration;
}
