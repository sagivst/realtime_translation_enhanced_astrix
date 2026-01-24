import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { StateTrainingCompletedTraining } from "./StateTrainingCompletedTraining.mjs";
import { StateTrainingFailed } from "./StateTrainingFailed.mjs";
import { StateTrainingInProgress } from "./StateTrainingInProgress.mjs";
import { StateTrainingQueued } from "./StateTrainingQueued.mjs";
export declare const StateTraining: core.serialization.Schema<serializers.expressionMeasurement.batch.StateTraining.Raw, Hume.expressionMeasurement.batch.StateTraining>;
export declare namespace StateTraining {
    type Raw = StateTraining.Queued | StateTraining.InProgress | StateTraining.Completed | StateTraining.Failed;
    interface Queued extends StateTrainingQueued.Raw {
        status: "QUEUED";
    }
    interface InProgress extends StateTrainingInProgress.Raw {
        status: "IN_PROGRESS";
    }
    interface Completed extends StateTrainingCompletedTraining.Raw {
        status: "COMPLETED";
    }
    interface Failed extends StateTrainingFailed.Raw {
        status: "FAILED";
    }
}
