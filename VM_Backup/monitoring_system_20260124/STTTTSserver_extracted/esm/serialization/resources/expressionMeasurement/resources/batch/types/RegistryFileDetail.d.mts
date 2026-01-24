import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const RegistryFileDetail: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.RegistryFileDetail.Raw, Hume.expressionMeasurement.batch.RegistryFileDetail>;
export declare namespace RegistryFileDetail {
    interface Raw {
        file_id: string;
        file_url: string;
    }
}
