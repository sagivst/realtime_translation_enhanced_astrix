import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { CompletedTraining } from "./CompletedTraining.js";
export declare const StateTrainingCompletedTraining: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateTrainingCompletedTraining.Raw, Hume.expressionMeasurement.batch.StateTrainingCompletedTraining>;
export declare namespace StateTrainingCompletedTraining {
    interface Raw extends CompletedTraining.Raw {
    }
}
