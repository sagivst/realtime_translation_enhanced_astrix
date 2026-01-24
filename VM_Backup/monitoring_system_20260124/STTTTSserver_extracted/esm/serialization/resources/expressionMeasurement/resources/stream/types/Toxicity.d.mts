import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { ToxicityItem } from "./ToxicityItem.mjs";
export declare const Toxicity: core.serialization.Schema<serializers.expressionMeasurement.stream.Toxicity.Raw, Hume.expressionMeasurement.stream.Toxicity>;
export declare namespace Toxicity {
    type Raw = ToxicityItem.Raw[];
}
