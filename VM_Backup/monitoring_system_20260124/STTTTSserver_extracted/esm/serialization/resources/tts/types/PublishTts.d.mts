import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { PostedUtteranceVoice } from "./PostedUtteranceVoice.mjs";
export declare const PublishTts: core.serialization.ObjectSchema<serializers.tts.PublishTts.Raw, Hume.tts.PublishTts>;
export declare namespace PublishTts {
    interface Raw {
        close?: boolean | null;
        description?: string | null;
        flush?: boolean | null;
        speed?: number | null;
        text?: string | null;
        trailing_silence?: number | null;
        voice?: PostedUtteranceVoice.Raw | null;
    }
}
