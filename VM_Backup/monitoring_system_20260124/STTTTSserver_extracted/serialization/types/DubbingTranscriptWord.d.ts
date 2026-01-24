import type * as ElevenLabs from "../../api/index";
import * as core from "../../core";
import type * as serializers from "../index";
import { DubbingTranscriptCharacter } from "./DubbingTranscriptCharacter";
export declare const DubbingTranscriptWord: core.serialization.ObjectSchema<serializers.DubbingTranscriptWord.Raw, ElevenLabs.DubbingTranscriptWord>;
export declare namespace DubbingTranscriptWord {
    interface Raw {
        text: string;
        word_type: string;
        start_s?: number | null;
        end_s?: number | null;
        characters?: DubbingTranscriptCharacter.Raw[] | null;
    }
}
