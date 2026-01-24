import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { File_ } from "./File_.js";
import { Models } from "./Models.js";
import { Transcription } from "./Transcription.js";
export declare const InferenceRequest: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.InferenceRequest.Raw, Hume.expressionMeasurement.batch.InferenceRequest>;
export declare namespace InferenceRequest {
    interface Raw {
        models?: Models.Raw | null;
        transcription?: Transcription.Raw | null;
        urls?: string[] | null;
        text?: string[] | null;
        callback_url?: string | null;
        notify?: boolean | null;
        files: File_.Raw[];
    }
}
