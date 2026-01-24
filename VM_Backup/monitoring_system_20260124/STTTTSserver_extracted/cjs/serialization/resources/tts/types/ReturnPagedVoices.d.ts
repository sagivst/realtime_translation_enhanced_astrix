import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnVoice } from "./ReturnVoice.js";
export declare const ReturnPagedVoices: core.serialization.ObjectSchema<serializers.tts.ReturnPagedVoices.Raw, Hume.tts.ReturnPagedVoices>;
export declare namespace ReturnPagedVoices {
    interface Raw {
        page_number?: number | null;
        page_size?: number | null;
        total_pages?: number | null;
        voices_page?: ReturnVoice.Raw[] | null;
    }
}
