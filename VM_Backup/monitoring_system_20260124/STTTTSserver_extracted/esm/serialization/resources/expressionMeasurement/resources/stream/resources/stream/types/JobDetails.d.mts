import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
export declare const JobDetails: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.JobDetails.Raw, Hume.expressionMeasurement.stream.JobDetails>;
export declare namespace JobDetails {
    interface Raw {
        job_id?: string | null;
    }
}
