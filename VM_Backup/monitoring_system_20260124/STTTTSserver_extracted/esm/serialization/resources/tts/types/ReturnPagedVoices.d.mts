import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnVoice } from "./ReturnVoice.mjs";
export declare const ReturnPagedVoices: core.serialization.ObjectSchema<serializers.tts.ReturnPagedVoices.Raw, Hume.tts.ReturnPagedVoices>;
export declare namespace ReturnPagedVoices {
    interface Raw {
        page_number?: number | null;
        page_size?: number | null;
        total_pages?: number | null;
        voices_page?: ReturnVoice.Raw[] | null;
    }
}
