import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const When: core.serialization.Schema<serializers.expressionMeasurement.batch.When.Raw, Hume.expressionMeasurement.batch.When>;
export declare namespace When {
    type Raw = "created_before" | "created_after";
}
