import type * as Hume from "../../../index.mjs";
export interface ValidationError {
    loc: Hume.tts.ValidationErrorLocItem[];
    msg: string;
    type: string;
}
