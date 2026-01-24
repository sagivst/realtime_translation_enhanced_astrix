import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { JobInference } from "./JobInference.js";
export declare const InferenceJob: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.InferenceJob.Raw, Hume.expressionMeasurement.batch.InferenceJob>;
export declare namespace InferenceJob {
    interface Raw extends JobInference.Raw {
        type: string;
    }
}
