import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const SortBy: core.serialization.Schema<serializers.expressionMeasurement.batch.SortBy.Raw, Hume.expressionMeasurement.batch.SortBy>;
export declare namespace SortBy {
    type Raw = "created" | "started" | "ended";
}
