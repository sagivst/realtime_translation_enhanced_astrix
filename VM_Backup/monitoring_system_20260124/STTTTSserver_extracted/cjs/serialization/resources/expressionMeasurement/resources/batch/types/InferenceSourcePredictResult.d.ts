import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { InferenceResults } from "./InferenceResults.js";
import { Source } from "./Source.js";
export declare const InferenceSourcePredictResult: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.InferenceSourcePredictResult.Raw, Hume.expressionMeasurement.batch.InferenceSourcePredictResult>;
export declare namespace InferenceSourcePredictResult {
    interface Raw {
        source: Source.Raw;
        results?: InferenceResults.Raw | null;
        error?: string | null;
    }
}
