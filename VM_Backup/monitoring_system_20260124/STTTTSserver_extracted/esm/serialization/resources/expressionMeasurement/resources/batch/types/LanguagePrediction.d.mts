import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { EmotionScore } from "./EmotionScore.mjs";
import { PositionInterval } from "./PositionInterval.mjs";
import { SentimentScore } from "./SentimentScore.mjs";
import { TimeInterval } from "./TimeInterval.mjs";
import { ToxicityScore } from "./ToxicityScore.mjs";
export declare const LanguagePrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.LanguagePrediction.Raw, Hume.expressionMeasurement.batch.LanguagePrediction>;
export declare namespace LanguagePrediction {
    interface Raw {
        text: string;
        position: PositionInterval.Raw;
        time?: TimeInterval.Raw | null;
        confidence?: number | null;
        speaker_confidence?: number | null;
        emotions: EmotionScore.Raw[];
        sentiment?: SentimentScore.Raw[] | null;
        toxicity?: ToxicityScore.Raw[] | null;
    }
}
