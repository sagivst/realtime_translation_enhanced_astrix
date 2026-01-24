import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Queued } from "./Queued.mjs";
export declare const StateTlInferenceQueued: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateTlInferenceQueued.Raw, Hume.expressionMeasurement.batch.StateTlInferenceQueued>;
export declare namespace StateTlInferenceQueued {
    interface Raw extends Queued.Raw {
    }
}
