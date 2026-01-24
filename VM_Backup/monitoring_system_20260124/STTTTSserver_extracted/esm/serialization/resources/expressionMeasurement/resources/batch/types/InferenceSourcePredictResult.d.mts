import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { InferenceResults } from "./InferenceResults.mjs";
import { Source } from "./Source.mjs";
export declare const InferenceSourcePredictResult: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.InferenceSourcePredictResult.Raw, Hume.expressionMeasurement.batch.InferenceSourcePredictResult>;
export declare namespace InferenceSourcePredictResult {
    interface Raw {
        source: Source.Raw;
        results?: InferenceResults.Raw | null;
        error?: string | null;
    }
}
