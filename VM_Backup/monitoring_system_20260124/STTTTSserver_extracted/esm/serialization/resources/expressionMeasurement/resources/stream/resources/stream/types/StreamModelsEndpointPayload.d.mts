import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
import { Config } from "./Config.mjs";
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
