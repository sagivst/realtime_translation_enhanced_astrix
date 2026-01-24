import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const Status: core.serialization.Schema<serializers.expressionMeasurement.batch.Status.Raw, Hume.expressionMeasurement.batch.Status>;
export declare namespace Status {
    type Raw = "QUEUED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}
