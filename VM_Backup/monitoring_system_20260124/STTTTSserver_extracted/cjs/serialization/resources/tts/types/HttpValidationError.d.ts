import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ValidationError } from "./ValidationError.js";
export declare const HttpValidationError: core.serialization.ObjectSchema<serializers.tts.HttpValidationError.Raw, Hume.tts.HttpValidationError>;
export declare namespace HttpValidationError {
    interface Raw {
        detail?: ValidationError.Raw[] | null;
    }
}
