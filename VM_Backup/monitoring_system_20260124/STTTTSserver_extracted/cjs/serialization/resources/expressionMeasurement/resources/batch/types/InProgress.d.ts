import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const InProgress: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.InProgress.Raw, Hume.expressionMeasurement.batch.InProgress>;
export declare namespace InProgress {
    interface Raw {
        created_timestamp_ms: number;
        started_timestamp_ms: number;
    }
}
