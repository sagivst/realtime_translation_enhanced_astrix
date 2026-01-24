import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Queued } from "./Queued.js";
export declare const QueuedState: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.QueuedState.Raw, Hume.expressionMeasurement.batch.QueuedState>;
export declare namespace QueuedState {
    interface Raw extends Queued.Raw {
    }
}
