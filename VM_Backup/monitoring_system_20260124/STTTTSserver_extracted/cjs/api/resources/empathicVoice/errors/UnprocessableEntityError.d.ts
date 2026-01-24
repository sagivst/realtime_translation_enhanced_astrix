import type * as core from "../../../../core/index.js";
import * as errors from "../../../../errors/index.js";
import type * as Hume from "../../../index.js";
export declare class UnprocessableEntityError extends errors.HumeError {
    constructor(body: Hume.empathicVoice.HttpValidationError, rawResponse?: core.RawResponse);
}
