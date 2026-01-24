import type * as core from "../../../../core/index.mjs";
import * as errors from "../../../../errors/index.mjs";
import type * as Hume from "../../../index.mjs";
export declare class BadRequestError extends errors.HumeError {
    constructor(body: Hume.tts.ErrorResponse, rawResponse?: core.RawResponse);
}
