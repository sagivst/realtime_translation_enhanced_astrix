import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { InProgress } from "./InProgress.mjs";
export declare const InProgressState: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.InProgressState.Raw, Hume.expressionMeasurement.batch.InProgressState>;
export declare namespace InProgressState {
    interface Raw extends InProgress.Raw {
    }
}
