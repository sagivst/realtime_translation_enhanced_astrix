import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Failed } from "./Failed.mjs";
export declare const StateTlInferenceFailed: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateTlInferenceFailed.Raw, Hume.expressionMeasurement.batch.StateTlInferenceFailed>;
export declare namespace StateTlInferenceFailed {
    interface Raw extends Failed.Raw {
    }
}
