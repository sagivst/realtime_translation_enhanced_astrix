import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { CustomModelPrediction } from "./CustomModelPrediction.js";
export declare const TlInferencePrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.TlInferencePrediction.Raw, Hume.expressionMeasurement.batch.TlInferencePrediction>;
export declare namespace TlInferencePrediction {
    interface Raw {
        file: string;
        file_type: string;
        custom_models: Record<string, CustomModelPrediction.Raw>;
    }
}
