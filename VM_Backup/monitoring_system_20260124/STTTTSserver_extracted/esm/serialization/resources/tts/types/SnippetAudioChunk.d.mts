import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { AudioFormatType } from "./AudioFormatType.mjs";
import { Snippet } from "./Snippet.mjs";
export declare const SnippetAudioChunk: core.serialization.ObjectSchema<serializers.tts.SnippetAudioChunk.Raw, Hume.tts.SnippetAudioChunk>;
export declare namespace SnippetAudioChunk {
    interface Raw {
        audio: string;
        audio_format: AudioFormatType.Raw;
        chunk_index: number;
        generation_id: string;
        is_last_chunk: boolean;
        request_id: string;
        snippet?: Snippet.Raw | null;
        snippet_id: string;
        text: string;
        transcribed_text?: string | null;
        type: "audio";
        utterance_index?: number | null;
    }
}
