import type * as Hume from "../../../../../index.mjs";
export interface CompletedTraining {
    /** When this job was created (Unix timestamp in milliseconds). */
    createdTimestampMs: number;
    /** When this job started (Unix timestamp in milliseconds). */
    startedTimestampMs: number;
    /** When this job ended (Unix timestamp in milliseconds). */
    endedTimestampMs: number;
    customModel: Hume.expressionMeasurement.batch.TrainingCustomModel;
    alternatives?: Record<string, Hume.expressionMeasurement.batch.TrainingCustomModel>;
}
