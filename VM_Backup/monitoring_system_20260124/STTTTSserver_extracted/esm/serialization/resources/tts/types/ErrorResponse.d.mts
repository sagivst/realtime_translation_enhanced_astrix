import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ErrorResponse: core.serialization.ObjectSchema<serializers.tts.ErrorResponse.Raw, Hume.tts.ErrorResponse>;
export declare namespace ErrorResponse {
    interface Raw {
        code?: string | null;
        error?: string | null;
        message?: string | null;
    }
}
