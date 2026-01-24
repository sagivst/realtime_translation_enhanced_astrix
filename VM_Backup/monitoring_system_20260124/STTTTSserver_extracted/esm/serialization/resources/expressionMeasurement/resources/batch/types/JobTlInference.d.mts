import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { StateTlInference } from "./StateTlInference.mjs";
import { TlInferenceBaseRequest } from "./TlInferenceBaseRequest.mjs";
export declare const JobTlInference: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.JobTlInference.Raw, Hume.expressionMeasurement.batch.JobTlInference>;
export declare namespace JobTlInference {
    interface Raw {
        job_id: string;
        user_id: string;
        request: TlInferenceBaseRequest.Raw;
        state: StateTlInference.Raw;
    }
}
