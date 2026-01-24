import type * as Hume from "../../../../../../../api/index.mjs";
import * as core from "../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../index.mjs";
import { TtsOutput } from "../../../../types/TtsOutput.mjs";
export declare const StreamInputSocketResponse: core.serialization.Schema<serializers.tts.StreamInputSocketResponse.Raw, Hume.tts.TtsOutput>;
export declare namespace StreamInputSocketResponse {
    type Raw = TtsOutput.Raw;
}
