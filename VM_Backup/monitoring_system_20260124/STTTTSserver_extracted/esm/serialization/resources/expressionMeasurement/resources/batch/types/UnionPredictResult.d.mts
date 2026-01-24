import type * as Hume from "../../../../../../api/index.mjs";
import type * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { InferenceSourcePredictResult } from "./InferenceSourcePredictResult.mjs";
export declare const UnionPredictResult: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.UnionPredictResult.Raw, Hume.expressionMeasurement.batch.UnionPredictResult>;
export declare namespace UnionPredictResult {
    type Raw = InferenceSourcePredictResult.Raw;
}
