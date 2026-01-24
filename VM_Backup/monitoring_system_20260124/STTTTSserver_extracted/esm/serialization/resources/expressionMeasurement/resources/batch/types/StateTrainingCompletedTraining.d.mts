import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { CompletedTraining } from "./CompletedTraining.mjs";
export declare const StateTrainingCompletedTraining: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateTrainingCompletedTraining.Raw, Hume.expressionMeasurement.batch.StateTrainingCompletedTraining>;
export declare namespace StateTrainingCompletedTraining {
    interface Raw extends CompletedTraining.Raw {
    }
}
