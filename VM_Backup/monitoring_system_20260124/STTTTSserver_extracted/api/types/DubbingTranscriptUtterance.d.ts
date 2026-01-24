import type * as ElevenLabs from "../index";
export interface DubbingTranscriptUtterance {
    speakerId: string;
    startS?: number;
    endS?: number;
    words?: ElevenLabs.DubbingTranscriptWord[];
}
