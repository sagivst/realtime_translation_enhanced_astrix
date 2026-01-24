import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Queued } from "./Queued.js";
export declare const StateTlInferenceQueued: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateTlInferenceQueued.Raw, Hume.expressionMeasurement.batch.StateTlInferenceQueued>;
export declare namespace StateTlInferenceQueued {
    interface Raw extends Queued.Raw {
    }
}
