import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { SentimentItem } from "./SentimentItem.js";
export declare const Sentiment: core.serialization.Schema<serializers.expressionMeasurement.stream.Sentiment.Raw, Hume.expressionMeasurement.stream.Sentiment>;
export declare namespace Sentiment {
    type Raw = SentimentItem.Raw[];
}
