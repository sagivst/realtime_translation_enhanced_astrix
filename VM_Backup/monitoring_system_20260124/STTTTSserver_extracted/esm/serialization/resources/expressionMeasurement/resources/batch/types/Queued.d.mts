import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const Queued: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Queued.Raw, Hume.expressionMeasurement.batch.Queued>;
export declare namespace Queued {
    interface Raw {
        created_timestamp_ms: number;
    }
}
