import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
import { EmotionEmbedding } from "../../../types/EmotionEmbedding.js";
import { Sentiment } from "../../../types/Sentiment.js";
import { TextPosition } from "../../../types/TextPosition.js";
import { Toxicity } from "../../../types/Toxicity.js";
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
