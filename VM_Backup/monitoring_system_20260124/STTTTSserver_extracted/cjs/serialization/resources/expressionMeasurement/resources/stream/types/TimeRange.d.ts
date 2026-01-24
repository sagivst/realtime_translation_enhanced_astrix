import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const TimeRange: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.TimeRange.Raw, Hume.expressionMeasurement.stream.TimeRange>;
export declare namespace TimeRange {
    interface Raw {
        begin?: number | null;
        end?: number | null;
    }
}
