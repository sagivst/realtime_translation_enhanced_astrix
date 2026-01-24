import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
import { StreamWarningMessageJobDetails } from "./StreamWarningMessageJobDetails.js";
export declare const StreamWarningMessage: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamWarningMessage.Raw, Hume.expressionMeasurement.stream.StreamWarningMessage>;
export declare namespace StreamWarningMessage {
    interface Raw {
        warning?: string | null;
        code?: string | null;
        payload_id?: string | null;
        job_details?: StreamWarningMessageJobDetails.Raw | null;
    }
}
