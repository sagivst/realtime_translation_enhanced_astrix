import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { SentimentItem } from "./SentimentItem.mjs";
export declare const Sentiment: core.serialization.Schema<serializers.expressionMeasurement.stream.Sentiment.Raw, Hume.expressionMeasurement.stream.Sentiment>;
export declare namespace Sentiment {
    type Raw = SentimentItem.Raw[];
}
