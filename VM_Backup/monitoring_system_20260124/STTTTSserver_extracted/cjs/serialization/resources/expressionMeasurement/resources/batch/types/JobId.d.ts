import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const JobId: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.JobId.Raw, Hume.expressionMeasurement.batch.JobId>;
export declare namespace JobId {
    interface Raw {
        job_id: string;
    }
}
