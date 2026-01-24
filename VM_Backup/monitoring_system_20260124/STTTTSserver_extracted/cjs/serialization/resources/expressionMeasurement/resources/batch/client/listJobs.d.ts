import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { UnionJob } from "../types/UnionJob.js";
export declare const Response: core.serialization.Schema<serializers.expressionMeasurement.batch.listJobs.Response.Raw, Hume.expressionMeasurement.batch.UnionJob[]>;
export declare namespace Response {
    type Raw = UnionJob.Raw[];
}
