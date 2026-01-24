import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const InProgress: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.InProgress.Raw, Hume.expressionMeasurement.batch.InProgress>;
export declare namespace InProgress {
    interface Raw {
        created_timestamp_ms: number;
        started_timestamp_ms: number;
    }
}
