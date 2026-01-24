import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { VoiceProvider } from "./VoiceProvider.mjs";
export declare const PostedUtteranceVoiceWithName: core.serialization.ObjectSchema<serializers.tts.PostedUtteranceVoiceWithName.Raw, Hume.tts.PostedUtteranceVoiceWithName>;
export declare namespace PostedUtteranceVoiceWithName {
    interface Raw {
        name: string;
        provider?: VoiceProvider.Raw | null;
    }
}
