import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Queued } from "./Queued.mjs";
export declare const StateTrainingQueued: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateTrainingQueued.Raw, Hume.expressionMeasurement.batch.StateTrainingQueued>;
export declare namespace StateTrainingQueued {
    interface Raw extends Queued.Raw {
    }
}
