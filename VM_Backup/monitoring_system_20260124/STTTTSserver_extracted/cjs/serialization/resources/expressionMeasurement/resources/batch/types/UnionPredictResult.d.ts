import type * as Hume from "../../../../../../api/index.js";
import type * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { InferenceSourcePredictResult } from "./InferenceSourcePredictResult.js";
export declare const UnionPredictResult: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.UnionPredictResult.Raw, Hume.expressionMeasurement.batch.UnionPredictResult>;
export declare namespace UnionPredictResult {
    type Raw = InferenceSourcePredictResult.Raw;
}
