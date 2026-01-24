import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { AudioEncoding } from "./AudioEncoding.mjs";
import { Snippet } from "./Snippet.mjs";
export declare const ReturnGeneration: core.serialization.ObjectSchema<serializers.tts.ReturnGeneration.Raw, Hume.tts.ReturnGeneration>;
export declare namespace ReturnGeneration {
    interface Raw {
        audio: string;
        duration: number;
        encoding: AudioEncoding.Raw;
        file_size: number;
        generation_id: string;
        snippets: Snippet.Raw[][];
    }
}
