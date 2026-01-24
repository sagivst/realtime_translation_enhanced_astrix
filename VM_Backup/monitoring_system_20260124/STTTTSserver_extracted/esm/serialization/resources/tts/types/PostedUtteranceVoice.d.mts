import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { PostedUtteranceVoiceWithId } from "./PostedUtteranceVoiceWithId.mjs";
import { PostedUtteranceVoiceWithName } from "./PostedUtteranceVoiceWithName.mjs";
export declare const PostedUtteranceVoice: core.serialization.Schema<serializers.tts.PostedUtteranceVoice.Raw, Hume.tts.PostedUtteranceVoice>;
export declare namespace PostedUtteranceVoice {
    type Raw = PostedUtteranceVoiceWithId.Raw | PostedUtteranceVoiceWithName.Raw;
}
