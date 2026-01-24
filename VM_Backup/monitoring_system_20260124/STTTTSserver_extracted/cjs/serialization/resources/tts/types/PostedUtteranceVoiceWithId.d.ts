import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { VoiceProvider } from "./VoiceProvider.js";
export declare const PostedUtteranceVoiceWithId: core.serialization.ObjectSchema<serializers.tts.PostedUtteranceVoiceWithId.Raw, Hume.tts.PostedUtteranceVoiceWithId>;
export declare namespace PostedUtteranceVoiceWithId {
    interface Raw {
        id: string;
        provider?: VoiceProvider.Raw | null;
    }
}
