import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const Direction: core.serialization.Schema<serializers.expressionMeasurement.batch.Direction.Raw, Hume.expressionMeasurement.batch.Direction>;
export declare namespace Direction {
    type Raw = "asc" | "desc";
}
