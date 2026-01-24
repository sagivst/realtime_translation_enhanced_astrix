import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { ModelsPredictions } from "./ModelsPredictions.js";
export declare const InferencePrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.InferencePrediction.Raw, Hume.expressionMeasurement.batch.InferencePrediction>;
export declare namespace InferencePrediction {
    interface Raw {
        file: string;
        models: ModelsPredictions.Raw;
    }
}
