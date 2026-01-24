import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
import { JobDetails } from "./JobDetails.js";
export declare const StreamErrorMessage: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamErrorMessage.Raw, Hume.expressionMeasurement.stream.StreamErrorMessage>;
export declare namespace StreamErrorMessage {
    interface Raw {
        error?: string | null;
        code?: string | null;
        payload_id?: string | null;
        job_details?: JobDetails.Raw | null;
    }
}
