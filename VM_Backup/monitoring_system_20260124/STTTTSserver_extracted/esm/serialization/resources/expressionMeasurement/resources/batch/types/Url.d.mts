import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const Url: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Url.Raw, Hume.expressionMeasurement.batch.Url>;
export declare namespace Url {
    interface Raw {
        url: string;
    }
}
