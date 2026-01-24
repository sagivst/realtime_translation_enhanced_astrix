import type * as Hume from "../../../../../index.mjs";
export type StateTraining = Hume.expressionMeasurement.batch.StateTraining.Queued | Hume.expressionMeasurement.batch.StateTraining.InProgress | Hume.expressionMeasurement.batch.StateTraining.Completed | Hume.expressionMeasurement.batch.StateTraining.Failed;
export declare namespace StateTraining {
    interface Queued extends Hume.expressionMeasurement.batch.StateTrainingQueued {
        status: "QUEUED";
    }
    interface InProgress extends Hume.expressionMeasurement.batch.StateTrainingInProgress {
        status: "IN_PROGRESS";
    }
    interface Completed extends Hume.expressionMeasurement.batch.StateTrainingCompletedTraining {
        status: "COMPLETED";
    }
    interface Failed extends Hume.expressionMeasurement.batch.StateTrainingFailed {
        status: "FAILED";
    }
}
