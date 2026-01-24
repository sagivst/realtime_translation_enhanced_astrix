import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Source } from "./Source.js";
import { TlInferenceResults } from "./TlInferenceResults.js";
export declare const TlInferenceSourcePredictResult: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.TlInferenceSourcePredictResult.Raw, Hume.expressionMeasurement.batch.TlInferenceSourcePredictResult>;
export declare namespace TlInferenceSourcePredictResult {
    interface Raw {
        source: Source.Raw;
        results?: TlInferenceResults.Raw | null;
        error?: string | null;
    }
}
