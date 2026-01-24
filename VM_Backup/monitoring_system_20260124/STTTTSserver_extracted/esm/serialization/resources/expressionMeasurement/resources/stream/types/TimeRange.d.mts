import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const TimeRange: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.TimeRange.Raw, Hume.expressionMeasurement.stream.TimeRange>;
export declare namespace TimeRange {
    interface Raw {
        begin?: number | null;
        end?: number | null;
    }
}
