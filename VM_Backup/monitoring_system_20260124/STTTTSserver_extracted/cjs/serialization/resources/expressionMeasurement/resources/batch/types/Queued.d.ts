import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const Queued: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Queued.Raw, Hume.expressionMeasurement.batch.Queued>;
export declare namespace Queued {
    interface Raw {
        created_timestamp_ms: number;
    }
}
