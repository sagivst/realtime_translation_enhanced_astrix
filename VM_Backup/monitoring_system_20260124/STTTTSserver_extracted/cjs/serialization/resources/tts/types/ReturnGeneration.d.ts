import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { AudioEncoding } from "./AudioEncoding.js";
import { Snippet } from "./Snippet.js";
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
