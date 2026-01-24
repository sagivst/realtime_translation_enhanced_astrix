import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const Failed: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Failed.Raw, Hume.expressionMeasurement.batch.Failed>;
export declare namespace Failed {
    interface Raw {
        created_timestamp_ms: number;
        started_timestamp_ms: number;
        ended_timestamp_ms: number;
        message: string;
    }
}
