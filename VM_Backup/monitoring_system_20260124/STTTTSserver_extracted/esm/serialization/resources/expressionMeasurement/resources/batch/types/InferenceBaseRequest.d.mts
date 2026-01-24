import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Models } from "./Models.mjs";
import { Transcription } from "./Transcription.mjs";
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
