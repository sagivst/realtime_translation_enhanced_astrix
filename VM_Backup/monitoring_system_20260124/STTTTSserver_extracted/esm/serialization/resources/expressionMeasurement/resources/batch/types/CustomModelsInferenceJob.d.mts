import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { JobTlInference } from "./JobTlInference.mjs";
export declare const CustomModelsInferenceJob: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.CustomModelsInferenceJob.Raw, Hume.expressionMeasurement.batch.CustomModelsInferenceJob>;
export declare namespace CustomModelsInferenceJob {
    interface Raw extends JobTlInference.Raw {
        type: string;
    }
}
