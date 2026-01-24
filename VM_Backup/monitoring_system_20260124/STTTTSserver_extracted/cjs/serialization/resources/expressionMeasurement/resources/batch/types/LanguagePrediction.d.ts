import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { EmotionScore } from "./EmotionScore.js";
import { PositionInterval } from "./PositionInterval.js";
import { SentimentScore } from "./SentimentScore.js";
import { TimeInterval } from "./TimeInterval.js";
import { ToxicityScore } from "./ToxicityScore.js";
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
