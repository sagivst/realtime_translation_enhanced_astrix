import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
export declare const StreamWarningMessageJobDetails: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamWarningMessageJobDetails.Raw, Hume.expressionMeasurement.stream.StreamWarningMessageJobDetails>;
export declare namespace StreamWarningMessageJobDetails {
    interface Raw {
        job_id?: string | null;
    }
}
