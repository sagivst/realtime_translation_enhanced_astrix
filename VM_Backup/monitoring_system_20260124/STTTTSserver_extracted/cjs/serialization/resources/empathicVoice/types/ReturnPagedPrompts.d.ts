import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnPrompt } from "./ReturnPrompt.js";
export declare const ReturnPagedPrompts: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnPagedPrompts.Raw, Hume.empathicVoice.ReturnPagedPrompts>;
export declare namespace ReturnPagedPrompts {
    interface Raw {
        page_number: number;
        page_size: number;
        prompts_page: (ReturnPrompt.Raw | null | undefined)[];
        total_pages: number;
    }
}
