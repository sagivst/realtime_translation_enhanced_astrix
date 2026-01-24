import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Bcp47Tag } from "./Bcp47Tag.js";
export declare const TranscriptionMetadata: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.TranscriptionMetadata.Raw, Hume.expressionMeasurement.batch.TranscriptionMetadata>;
export declare namespace TranscriptionMetadata {
    interface Raw {
        confidence: number;
        detected_language?: Bcp47Tag.Raw | null;
    }
}
