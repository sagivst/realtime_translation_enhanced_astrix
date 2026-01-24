import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { InProgress } from "./InProgress.js";
export declare const StateTrainingInProgress: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateTrainingInProgress.Raw, Hume.expressionMeasurement.batch.StateTrainingInProgress>;
export declare namespace StateTrainingInProgress {
    interface Raw extends InProgress.Raw {
    }
}
