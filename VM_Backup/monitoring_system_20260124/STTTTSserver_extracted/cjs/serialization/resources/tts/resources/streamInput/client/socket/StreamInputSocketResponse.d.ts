import type * as Hume from "../../../../../../../api/index.js";
import * as core from "../../../../../../../core/index.js";
import type * as serializers from "../../../../../../index.js";
import { TtsOutput } from "../../../../types/TtsOutput.js";
export declare const StreamInputSocketResponse: core.serialization.Schema<serializers.tts.StreamInputSocketResponse.Raw, Hume.tts.TtsOutput>;
export declare namespace StreamInputSocketResponse {
    type Raw = TtsOutput.Raw;
}
