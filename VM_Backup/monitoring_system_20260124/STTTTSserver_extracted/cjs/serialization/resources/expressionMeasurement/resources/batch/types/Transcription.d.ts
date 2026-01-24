import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Bcp47Tag } from "./Bcp47Tag.js";
export declare const Transcription: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Transcription.Raw, Hume.expressionMeasurement.batch.Transcription>;
export declare namespace Transcription {
    interface Raw {
        language?: Bcp47Tag.Raw | null;
        identify_speakers?: boolean | null;
        confidence_threshold?: number | null;
    }
}
