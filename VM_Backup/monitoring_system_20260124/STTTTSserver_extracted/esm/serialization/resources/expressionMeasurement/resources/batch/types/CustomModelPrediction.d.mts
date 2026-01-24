import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const CustomModelPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.CustomModelPrediction.Raw, Hume.expressionMeasurement.batch.CustomModelPrediction>;
export declare namespace CustomModelPrediction {
    interface Raw {
        output: Record<string, number>;
        error: string;
        task_type: string;
    }
}
