import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const RegistryFileDetail: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.RegistryFileDetail.Raw, Hume.expressionMeasurement.batch.RegistryFileDetail>;
export declare namespace RegistryFileDetail {
    interface Raw {
        file_id: string;
        file_url: string;
    }
}
