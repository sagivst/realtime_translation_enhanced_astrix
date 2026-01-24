import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { CustomModelPrediction } from "./CustomModelPrediction.mjs";
export declare const TlInferencePrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.TlInferencePrediction.Raw, Hume.expressionMeasurement.batch.TlInferencePrediction>;
export declare namespace TlInferencePrediction {
    interface Raw {
        file: string;
        file_type: string;
        custom_models: Record<string, CustomModelPrediction.Raw>;
    }
}
