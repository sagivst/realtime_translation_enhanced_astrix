import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { JobTlInference } from "./JobTlInference.js";
export declare const CustomModelsInferenceJob: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.CustomModelsInferenceJob.Raw, Hume.expressionMeasurement.batch.CustomModelsInferenceJob>;
export declare namespace CustomModelsInferenceJob {
    interface Raw extends JobTlInference.Raw {
        type: string;
    }
}
