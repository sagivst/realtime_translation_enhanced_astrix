import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { File_ } from "./File_.mjs";
import { Models } from "./Models.mjs";
import { Transcription } from "./Transcription.mjs";
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
