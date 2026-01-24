import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const Url: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Url.Raw, Hume.expressionMeasurement.batch.Url>;
export declare namespace Url {
    interface Raw {
        url: string;
    }
}
