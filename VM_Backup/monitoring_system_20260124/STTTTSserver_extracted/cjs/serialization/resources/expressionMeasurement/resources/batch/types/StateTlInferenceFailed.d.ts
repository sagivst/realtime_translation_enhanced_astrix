import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Failed } from "./Failed.js";
export declare const StateTlInferenceFailed: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateTlInferenceFailed.Raw, Hume.expressionMeasurement.batch.StateTlInferenceFailed>;
export declare namespace StateTlInferenceFailed {
    interface Raw extends Failed.Raw {
    }
}
