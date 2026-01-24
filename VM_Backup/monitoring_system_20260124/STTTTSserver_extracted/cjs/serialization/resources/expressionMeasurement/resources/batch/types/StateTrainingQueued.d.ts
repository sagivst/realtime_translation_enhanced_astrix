import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Queued } from "./Queued.js";
export declare const StateTrainingQueued: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateTrainingQueued.Raw, Hume.expressionMeasurement.batch.StateTrainingQueued>;
export declare namespace StateTrainingQueued {
    interface Raw extends Queued.Raw {
    }
}
