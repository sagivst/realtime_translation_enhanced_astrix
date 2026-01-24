import type * as core from "../../../../core/index.js";
import * as errors from "../../../../errors/index.js";
import type * as Hume from "../../../index.js";
export declare class BadRequestError extends errors.HumeError {
    constructor(body: Hume.empathicVoice.ErrorResponse, rawResponse?: core.RawResponse);
}
