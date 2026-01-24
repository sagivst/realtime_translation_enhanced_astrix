import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ErrorResponse: core.serialization.ObjectSchema<serializers.empathicVoice.ErrorResponse.Raw, Hume.empathicVoice.ErrorResponse>;
export declare namespace ErrorResponse {
    interface Raw {
        code?: string | null;
        error?: string | null;
        message?: string | null;
    }
}
