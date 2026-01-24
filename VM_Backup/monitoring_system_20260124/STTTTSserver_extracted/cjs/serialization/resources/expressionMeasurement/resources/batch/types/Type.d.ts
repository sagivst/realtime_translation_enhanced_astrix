import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const Type: core.serialization.Schema<serializers.expressionMeasurement.batch.Type.Raw, Hume.expressionMeasurement.batch.Type>;
export declare namespace Type {
    type Raw = "EMBEDDING_GENERATION" | "INFERENCE" | "TL_INFERENCE" | "TRAINING";
}
