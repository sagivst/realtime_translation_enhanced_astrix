import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { StateTlInference } from "./StateTlInference.js";
import { TlInferenceBaseRequest } from "./TlInferenceBaseRequest.js";
export declare const JobTlInference: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.JobTlInference.Raw, Hume.expressionMeasurement.batch.JobTlInference>;
export declare namespace JobTlInference {
    interface Raw {
        job_id: string;
        user_id: string;
        request: TlInferenceBaseRequest.Raw;
        state: StateTlInference.Raw;
    }
}
