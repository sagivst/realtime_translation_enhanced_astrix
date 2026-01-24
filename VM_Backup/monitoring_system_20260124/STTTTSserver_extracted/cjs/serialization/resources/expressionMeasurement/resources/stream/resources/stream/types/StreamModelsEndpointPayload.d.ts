import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
import { Config } from "./Config.js";
export declare const StreamModelsEndpointPayload: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelsEndpointPayload.Raw, Hume.expressionMeasurement.stream.StreamModelsEndpointPayload>;
export declare namespace StreamModelsEndpointPayload {
    interface Raw {
        data?: string | null;
        models?: Config.Raw | null;
        stream_window_ms?: number | null;
        reset_stream?: boolean | null;
        raw_text?: boolean | null;
        job_details?: boolean | null;
        payload_id?: string | null;
    }
}
