import type * as Hume from "../../../../../index.js";
export type StateTlInference = Hume.expressionMeasurement.batch.StateTlInference.Queued | Hume.expressionMeasurement.batch.StateTlInference.InProgress | Hume.expressionMeasurement.batch.StateTlInference.Completed | Hume.expressionMeasurement.batch.StateTlInference.Failed;
export declare namespace StateTlInference {
    interface Queued extends Hume.expressionMeasurement.batch.StateTlInferenceQueued {
        status: "QUEUED";
    }
    interface InProgress extends Hume.expressionMeasurement.batch.StateTlInferenceInProgress {
        status: "IN_PROGRESS";
    }
    interface Completed extends Hume.expressionMeasurement.batch.StateTlInferenceCompletedTlInference {
        status: "COMPLETED";
    }
    interface Failed extends Hume.expressionMeasurement.batch.StateTlInferenceFailed {
        status: "FAILED";
    }
}
