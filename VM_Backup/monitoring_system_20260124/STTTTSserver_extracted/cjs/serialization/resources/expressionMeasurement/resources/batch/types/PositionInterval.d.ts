import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const PositionInterval: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.PositionInterval.Raw, Hume.expressionMeasurement.batch.PositionInterval>;
export declare namespace PositionInterval {
    interface Raw {
        begin: number;
        end: number;
    }
}
