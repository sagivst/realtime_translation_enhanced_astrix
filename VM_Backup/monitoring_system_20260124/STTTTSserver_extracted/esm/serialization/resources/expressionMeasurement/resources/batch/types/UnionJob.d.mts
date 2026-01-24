import type * as Hume from "../../../../../../api/index.mjs";
import type * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { InferenceJob } from "./InferenceJob.mjs";
export declare const UnionJob: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.UnionJob.Raw, Hume.expressionMeasurement.batch.UnionJob>;
export declare namespace UnionJob {
    type Raw = InferenceJob.Raw;
}
