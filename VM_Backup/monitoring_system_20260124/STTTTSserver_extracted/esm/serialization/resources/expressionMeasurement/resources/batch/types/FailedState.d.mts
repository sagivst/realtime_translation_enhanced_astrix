import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Failed } from "./Failed.mjs";
export declare const FailedState: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.FailedState.Raw, Hume.expressionMeasurement.batch.FailedState>;
export declare namespace FailedState {
    interface Raw extends Failed.Raw {
    }
}
