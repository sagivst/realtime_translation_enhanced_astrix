import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { SnippetAudioChunk } from "./SnippetAudioChunk.mjs";
import { TimestampMessage } from "./TimestampMessage.mjs";
export declare const TtsOutput: core.serialization.Schema<serializers.tts.TtsOutput.Raw, Hume.tts.TtsOutput>;
export declare namespace TtsOutput {
    type Raw = SnippetAudioChunk.Raw | TimestampMessage.Raw;
}
