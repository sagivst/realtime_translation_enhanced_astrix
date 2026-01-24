import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Failed } from "./Failed.js";
export declare const FailedState: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.FailedState.Raw, Hume.expressionMeasurement.batch.FailedState>;
export declare namespace FailedState {
    interface Raw extends Failed.Raw {
    }
}
