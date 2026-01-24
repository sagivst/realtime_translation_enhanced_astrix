import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { InProgress } from "./InProgress.mjs";
export declare const StateTrainingInProgress: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateTrainingInProgress.Raw, Hume.expressionMeasurement.batch.StateTrainingInProgress>;
export declare namespace StateTrainingInProgress {
    interface Raw extends InProgress.Raw {
    }
}
