import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { UnionPredictResult } from "../types/UnionPredictResult.mjs";
export declare const Response: core.serialization.Schema<serializers.expressionMeasurement.batch.getJobPredictions.Response.Raw, Hume.expressionMeasurement.batch.UnionPredictResult[]>;
export declare namespace Response {
    type Raw = UnionPredictResult.Raw[];
}
