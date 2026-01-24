import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { JobInference } from "./JobInference.mjs";
export declare const InferenceJob: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.InferenceJob.Raw, Hume.expressionMeasurement.batch.InferenceJob>;
export declare namespace InferenceJob {
    interface Raw extends JobInference.Raw {
        type: string;
    }
}
