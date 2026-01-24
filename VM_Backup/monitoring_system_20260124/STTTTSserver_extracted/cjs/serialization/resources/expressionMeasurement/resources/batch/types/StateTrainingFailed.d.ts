import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Failed } from "./Failed.js";
export declare const StateTrainingFailed: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateTrainingFailed.Raw, Hume.expressionMeasurement.batch.StateTrainingFailed>;
export declare namespace StateTrainingFailed {
    interface Raw extends Failed.Raw {
    }
}
