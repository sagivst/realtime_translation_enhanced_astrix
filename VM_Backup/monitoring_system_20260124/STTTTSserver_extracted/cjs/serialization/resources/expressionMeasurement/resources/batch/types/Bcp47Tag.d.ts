import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const Bcp47Tag: core.serialization.Schema<serializers.expressionMeasurement.batch.Bcp47Tag.Raw, Hume.expressionMeasurement.batch.Bcp47Tag>;
export declare namespace Bcp47Tag {
    type Raw = "zh" | "da" | "nl" | "en" | "en-AU" | "en-IN" | "en-NZ" | "en-GB" | "fr" | "fr-CA" | "de" | "hi" | "hi-Latn" | "id" | "it" | "ja" | "ko" | "no" | "pl" | "pt" | "pt-BR" | "pt-PT" | "ru" | "es" | "es-419" | "sv" | "ta" | "tr" | "uk";
}
