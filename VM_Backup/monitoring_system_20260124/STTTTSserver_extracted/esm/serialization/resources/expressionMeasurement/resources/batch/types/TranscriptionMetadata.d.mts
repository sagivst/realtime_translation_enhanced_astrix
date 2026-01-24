import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Bcp47Tag } from "./Bcp47Tag.mjs";
export declare const TranscriptionMetadata: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.TranscriptionMetadata.Raw, Hume.expressionMeasurement.batch.TranscriptionMetadata>;
export declare namespace TranscriptionMetadata {
    interface Raw {
        confidence: number;
        detected_language?: Bcp47Tag.Raw | null;
    }
}
