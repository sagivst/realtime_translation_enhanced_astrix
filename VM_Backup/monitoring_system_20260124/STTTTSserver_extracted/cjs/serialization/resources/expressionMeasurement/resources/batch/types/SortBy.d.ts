import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const SortBy: core.serialization.Schema<serializers.expressionMeasurement.batch.SortBy.Raw, Hume.expressionMeasurement.batch.SortBy>;
export declare namespace SortBy {
    type Raw = "created" | "started" | "ended";
}
