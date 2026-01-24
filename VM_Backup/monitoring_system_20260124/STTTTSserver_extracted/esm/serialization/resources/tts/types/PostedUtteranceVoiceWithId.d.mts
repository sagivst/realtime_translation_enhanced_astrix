import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { VoiceProvider } from "./VoiceProvider.mjs";
export declare const PostedUtteranceVoiceWithId: core.serialization.ObjectSchema<serializers.tts.PostedUtteranceVoiceWithId.Raw, Hume.tts.PostedUtteranceVoiceWithId>;
export declare namespace PostedUtteranceVoiceWithId {
    interface Raw {
        id: string;
        provider?: VoiceProvider.Raw | null;
    }
}
