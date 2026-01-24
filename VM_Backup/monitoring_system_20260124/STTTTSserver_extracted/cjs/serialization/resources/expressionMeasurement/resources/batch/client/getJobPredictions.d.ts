import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { UnionPredictResult } from "../types/UnionPredictResult.js";
export declare const Response: core.serialization.Schema<serializers.expressionMeasurement.batch.getJobPredictions.Response.Raw, Hume.expressionMeasurement.batch.UnionPredictResult[]>;
export declare namespace Response {
    type Raw = UnionPredictResult.Raw[];
}
