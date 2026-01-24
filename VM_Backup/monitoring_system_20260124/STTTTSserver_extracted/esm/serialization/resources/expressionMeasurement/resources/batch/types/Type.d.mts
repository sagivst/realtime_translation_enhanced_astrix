import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const Type: core.serialization.Schema<serializers.expressionMeasurement.batch.Type.Raw, Hume.expressionMeasurement.batch.Type>;
export declare namespace Type {
    type Raw = "EMBEDDING_GENERATION" | "INFERENCE" | "TL_INFERENCE" | "TRAINING";
}
