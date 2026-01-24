import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { ModelsPredictions } from "./ModelsPredictions.mjs";
export declare const InferencePrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.InferencePrediction.Raw, Hume.expressionMeasurement.batch.InferencePrediction>;
export declare namespace InferencePrediction {
    interface Raw {
        file: string;
        models: ModelsPredictions.Raw;
    }
}
