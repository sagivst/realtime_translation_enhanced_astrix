import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Bcp47Tag } from "./Bcp47Tag.mjs";
export declare const Transcription: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Transcription.Raw, Hume.expressionMeasurement.batch.Transcription>;
export declare namespace Transcription {
    interface Raw {
        language?: Bcp47Tag.Raw | null;
        identify_speakers?: boolean | null;
        confidence_threshold?: number | null;
    }
}
