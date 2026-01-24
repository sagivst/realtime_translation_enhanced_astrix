import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ValidationErrorLocItem } from "./ValidationErrorLocItem.mjs";
export declare const ValidationError: core.serialization.ObjectSchema<serializers.empathicVoice.ValidationError.Raw, Hume.empathicVoice.ValidationError>;
export declare namespace ValidationError {
    interface Raw {
        loc: ValidationErrorLocItem.Raw[];
        msg: string;
        type: string;
    }
}
