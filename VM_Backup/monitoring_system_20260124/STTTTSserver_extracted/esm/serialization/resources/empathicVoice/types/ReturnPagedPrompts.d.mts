import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnPrompt } from "./ReturnPrompt.mjs";
export declare const ReturnPagedPrompts: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnPagedPrompts.Raw, Hume.empathicVoice.ReturnPagedPrompts>;
export declare namespace ReturnPagedPrompts {
    interface Raw {
        page_number: number;
        page_size: number;
        prompts_page: (ReturnPrompt.Raw | null | undefined)[];
        total_pages: number;
    }
}
