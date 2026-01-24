import type * as core from "../../../../core/index.mjs";
import * as errors from "../../../../errors/index.mjs";
import type * as Hume from "../../../index.mjs";
export declare class UnprocessableEntityError extends errors.HumeError {
    constructor(body: Hume.tts.HttpValidationError, rawResponse?: core.RawResponse);
}
