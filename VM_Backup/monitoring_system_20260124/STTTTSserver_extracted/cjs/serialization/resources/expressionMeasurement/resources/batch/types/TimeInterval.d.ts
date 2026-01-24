import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const TimeInterval: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.TimeInterval.Raw, Hume.expressionMeasurement.batch.TimeInterval>;
export declare namespace TimeInterval {
    interface Raw {
        begin: number;
        end: number;
    }
}
