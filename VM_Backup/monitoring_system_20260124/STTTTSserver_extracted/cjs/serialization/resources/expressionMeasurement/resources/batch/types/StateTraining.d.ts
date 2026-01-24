import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { StateTrainingCompletedTraining } from "./StateTrainingCompletedTraining.js";
import { StateTrainingFailed } from "./StateTrainingFailed.js";
import { StateTrainingInProgress } from "./StateTrainingInProgress.js";
import { StateTrainingQueued } from "./StateTrainingQueued.js";
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
