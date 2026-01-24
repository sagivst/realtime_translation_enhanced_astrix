import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { UnionJob } from "../types/UnionJob.mjs";
export declare const Response: core.serialization.Schema<serializers.expressionMeasurement.batch.listJobs.Response.Raw, Hume.expressionMeasurement.batch.UnionJob[]>;
export declare namespace Response {
    type Raw = UnionJob.Raw[];
}
