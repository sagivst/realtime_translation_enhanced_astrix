import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { InferenceRequest } from "./InferenceRequest.js";
import { StateInference } from "./StateInference.js";
export declare const JobInference: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.JobInference.Raw, Hume.expressionMeasurement.batch.JobInference>;
export declare namespace JobInference {
    interface Raw {
        job_id: string;
        request: InferenceRequest.Raw;
        state: StateInference.Raw;
    }
}
