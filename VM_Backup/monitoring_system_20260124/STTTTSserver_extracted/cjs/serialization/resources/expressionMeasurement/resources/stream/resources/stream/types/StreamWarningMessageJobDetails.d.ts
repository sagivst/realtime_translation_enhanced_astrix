import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
export declare const StreamWarningMessageJobDetails: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamWarningMessageJobDetails.Raw, Hume.expressionMeasurement.stream.StreamWarningMessageJobDetails>;
export declare namespace StreamWarningMessageJobDetails {
    interface Raw {
        job_id?: string | null;
    }
}
