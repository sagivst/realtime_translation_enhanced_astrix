import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Source } from "./Source.mjs";
import { TlInferenceResults } from "./TlInferenceResults.mjs";
export declare const TlInferenceSourcePredictResult: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.TlInferenceSourcePredictResult.Raw, Hume.expressionMeasurement.batch.TlInferenceSourcePredictResult>;
export declare namespace TlInferenceSourcePredictResult {
    interface Raw {
        source: Source.Raw;
        results?: TlInferenceResults.Raw | null;
        error?: string | null;
    }
}
