import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { ToxicityItem } from "./ToxicityItem.js";
export declare const Toxicity: core.serialization.Schema<serializers.expressionMeasurement.stream.Toxicity.Raw, Hume.expressionMeasurement.stream.Toxicity>;
export declare namespace Toxicity {
    type Raw = ToxicityItem.Raw[];
}
