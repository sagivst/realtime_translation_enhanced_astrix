import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const PositionInterval: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.PositionInterval.Raw, Hume.expressionMeasurement.batch.PositionInterval>;
export declare namespace PositionInterval {
    interface Raw {
        begin: number;
        end: number;
    }
}
