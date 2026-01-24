import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const JobId: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.JobId.Raw, Hume.expressionMeasurement.batch.JobId>;
export declare namespace JobId {
    interface Raw {
        job_id: string;
    }
}
