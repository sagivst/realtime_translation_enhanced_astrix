import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const TimeInterval: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.TimeInterval.Raw, Hume.expressionMeasurement.batch.TimeInterval>;
export declare namespace TimeInterval {
    interface Raw {
        begin: number;
        end: number;
    }
}
