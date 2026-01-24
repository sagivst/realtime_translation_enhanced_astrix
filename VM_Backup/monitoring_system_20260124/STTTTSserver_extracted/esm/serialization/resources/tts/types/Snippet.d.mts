import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { Timestamp } from "./Timestamp.mjs";
export declare const Snippet: core.serialization.ObjectSchema<serializers.tts.Snippet.Raw, Hume.tts.Snippet>;
export declare namespace Snippet {
    interface Raw {
        audio: string;
        generation_id: string;
        id: string;
        text: string;
        timestamps: Timestamp.Raw[];
        transcribed_text?: string | null;
        utterance_index?: number | null;
    }
}
