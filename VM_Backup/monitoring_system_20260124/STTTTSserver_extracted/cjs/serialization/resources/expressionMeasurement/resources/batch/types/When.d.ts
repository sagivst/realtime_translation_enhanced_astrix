import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const When: core.serialization.Schema<serializers.expressionMeasurement.batch.When.Raw, Hume.expressionMeasurement.batch.When>;
export declare namespace When {
    type Raw = "created_before" | "created_after";
}
