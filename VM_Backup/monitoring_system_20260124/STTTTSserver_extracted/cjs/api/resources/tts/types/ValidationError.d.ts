import type * as Hume from "../../../index.js";
export interface ValidationError {
    loc: Hume.tts.ValidationErrorLocItem[];
    msg: string;
    type: string;
}
