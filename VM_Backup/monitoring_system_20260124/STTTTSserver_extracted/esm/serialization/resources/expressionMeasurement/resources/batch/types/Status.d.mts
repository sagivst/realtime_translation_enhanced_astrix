import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const Status: core.serialization.Schema<serializers.expressionMeasurement.batch.Status.Raw, Hume.expressionMeasurement.batch.Status>;
export declare namespace Status {
    type Raw = "QUEUED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}
