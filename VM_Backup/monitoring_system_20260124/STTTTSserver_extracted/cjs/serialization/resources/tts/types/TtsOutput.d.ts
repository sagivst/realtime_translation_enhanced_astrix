import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { SnippetAudioChunk } from "./SnippetAudioChunk.js";
import { TimestampMessage } from "./TimestampMessage.js";
export declare const TtsOutput: core.serialization.Schema<serializers.tts.TtsOutput.Raw, Hume.tts.TtsOutput>;
export declare namespace TtsOutput {
    type Raw = SnippetAudioChunk.Raw | TimestampMessage.Raw;
}
