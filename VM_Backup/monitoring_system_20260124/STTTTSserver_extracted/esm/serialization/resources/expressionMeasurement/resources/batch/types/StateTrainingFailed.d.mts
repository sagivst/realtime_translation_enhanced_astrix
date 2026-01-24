import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Failed } from "./Failed.mjs";
export declare const StateTrainingFailed: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateTrainingFailed.Raw, Hume.expressionMeasurement.batch.StateTrainingFailed>;
export declare namespace StateTrainingFailed {
    interface Raw extends Failed.Raw {
    }
}
