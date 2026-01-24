import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Url } from "./Url.mjs";
export declare const SourceUrl: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.SourceUrl.Raw, Hume.expressionMeasurement.batch.SourceUrl>;
export declare namespace SourceUrl {
    interface Raw extends Url.Raw {
    }
}
