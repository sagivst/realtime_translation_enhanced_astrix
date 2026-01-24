import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Models } from "./Models.js";
import { Transcription } from "./Transcription.js";
export declare const InferenceBaseRequest: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.InferenceBaseRequest.Raw, Hume.expressionMeasurement.batch.InferenceBaseRequest>;
export declare namespace InferenceBaseRequest {
    interface Raw {
        models?: Models.Raw | null;
        transcription?: Transcription.Raw | null;
        urls?: string[] | null;
        text?: string[] | null;
        callback_url?: string | null;
        notify?: boolean | null;
    }
}
