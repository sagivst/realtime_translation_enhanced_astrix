import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { InProgress } from "./InProgress.mjs";
export declare const StateTlInferenceInProgress: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateTlInferenceInProgress.Raw, Hume.expressionMeasurement.batch.StateTlInferenceInProgress>;
export declare namespace StateTlInferenceInProgress {
    interface Raw extends InProgress.Raw {
    }
}
