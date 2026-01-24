import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { RegistryFileDetail } from "./RegistryFileDetail.mjs";
export declare const EmbeddingGenerationBaseRequest: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.EmbeddingGenerationBaseRequest.Raw, Hume.expressionMeasurement.batch.EmbeddingGenerationBaseRequest>;
export declare namespace EmbeddingGenerationBaseRequest {
    interface Raw {
        registry_file_details?: RegistryFileDetail.Raw[] | null;
    }
}
