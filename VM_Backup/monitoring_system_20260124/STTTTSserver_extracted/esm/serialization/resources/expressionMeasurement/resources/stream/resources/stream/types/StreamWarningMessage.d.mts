import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
import { StreamWarningMessageJobDetails } from "./StreamWarningMessageJobDetails.mjs";
export declare const StreamWarningMessage: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamWarningMessage.Raw, Hume.expressionMeasurement.stream.StreamWarningMessage>;
export declare namespace StreamWarningMessage {
    interface Raw {
        warning?: string | null;
        code?: string | null;
        payload_id?: string | null;
        job_details?: StreamWarningMessageJobDetails.Raw | null;
    }
}
