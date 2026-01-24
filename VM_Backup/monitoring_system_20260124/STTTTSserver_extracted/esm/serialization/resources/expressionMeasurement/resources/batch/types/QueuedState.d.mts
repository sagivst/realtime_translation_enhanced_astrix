import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Queued } from "./Queued.mjs";
export declare const QueuedState: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.QueuedState.Raw, Hume.expressionMeasurement.batch.QueuedState>;
export declare namespace QueuedState {
    interface Raw extends Queued.Raw {
    }
}
