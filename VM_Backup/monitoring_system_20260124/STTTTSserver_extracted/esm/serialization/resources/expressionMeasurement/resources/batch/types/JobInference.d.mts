import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { InferenceRequest } from "./InferenceRequest.mjs";
import { StateInference } from "./StateInference.mjs";
export declare const JobInference: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.JobInference.Raw, Hume.expressionMeasurement.batch.JobInference>;
export declare namespace JobInference {
    interface Raw {
        job_id: string;
        request: InferenceRequest.Raw;
        state: StateInference.Raw;
    }
}
