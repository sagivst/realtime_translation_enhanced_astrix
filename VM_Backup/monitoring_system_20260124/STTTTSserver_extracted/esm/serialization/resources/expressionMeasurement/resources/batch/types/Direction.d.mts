import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const Direction: core.serialization.Schema<serializers.expressionMeasurement.batch.Direction.Raw, Hume.expressionMeasurement.batch.Direction>;
export declare namespace Direction {
    type Raw = "asc" | "desc";
}
