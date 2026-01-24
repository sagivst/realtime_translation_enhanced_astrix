import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Url } from "./Url.js";
export declare const SourceUrl: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.SourceUrl.Raw, Hume.expressionMeasurement.batch.SourceUrl>;
export declare namespace SourceUrl {
    interface Raw extends Url.Raw {
    }
}
