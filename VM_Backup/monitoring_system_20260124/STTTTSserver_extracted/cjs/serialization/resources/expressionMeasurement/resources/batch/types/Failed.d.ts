import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const Failed: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Failed.Raw, Hume.expressionMeasurement.batch.Failed>;
export declare namespace Failed {
    interface Raw {
        created_timestamp_ms: number;
        started_timestamp_ms: number;
        ended_timestamp_ms: number;
        message: string;
    }
}
