import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { InProgress } from "./InProgress.js";
export declare const InProgressState: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.InProgressState.Raw, Hume.expressionMeasurement.batch.InProgressState>;
export declare namespace InProgressState {
    interface Raw extends InProgress.Raw {
    }
}
