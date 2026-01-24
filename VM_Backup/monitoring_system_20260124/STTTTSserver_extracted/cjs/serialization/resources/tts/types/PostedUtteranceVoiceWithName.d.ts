import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { VoiceProvider } from "./VoiceProvider.js";
export declare const PostedUtteranceVoiceWithName: core.serialization.ObjectSchema<serializers.tts.PostedUtteranceVoiceWithName.Raw, Hume.tts.PostedUtteranceVoiceWithName>;
export declare namespace PostedUtteranceVoiceWithName {
    interface Raw {
        name: string;
        provider?: VoiceProvider.Raw | null;
    }
}
