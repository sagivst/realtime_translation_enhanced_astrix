import type * as Hume from "../../../../../../api/index.js";
import type * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { InferenceJob } from "./InferenceJob.js";
export declare const UnionJob: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.UnionJob.Raw, Hume.expressionMeasurement.batch.UnionJob>;
export declare namespace UnionJob {
    type Raw = InferenceJob.Raw;
}
