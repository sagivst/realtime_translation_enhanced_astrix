import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
export declare const JobDetails: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.JobDetails.Raw, Hume.expressionMeasurement.stream.JobDetails>;
export declare namespace JobDetails {
    interface Raw {
        job_id?: string | null;
    }
}
