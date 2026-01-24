import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
import { EmotionEmbedding } from "../../../types/EmotionEmbedding.mjs";
import { Sentiment } from "../../../types/Sentiment.mjs";
import { TextPosition } from "../../../types/TextPosition.mjs";
import { Toxicity } from "../../../types/Toxicity.mjs";
export declare const StreamModelPredictionsLanguagePredictionsItem: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsLanguagePredictionsItem.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsLanguagePredictionsItem>;
export declare namespace StreamModelPredictionsLanguagePredictionsItem {
    interface Raw {
        text?: string | null;
        position?: TextPosition.Raw | null;
        emotions?: EmotionEmbedding.Raw | null;
        sentiment?: Sentiment.Raw | null;
        toxicity?: Toxicity.Raw | null;
    }
}
