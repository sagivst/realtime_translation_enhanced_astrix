import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { RegistryFileDetail } from "./RegistryFileDetail.js";
export declare const EmbeddingGenerationBaseRequest: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.EmbeddingGenerationBaseRequest.Raw, Hume.expressionMeasurement.batch.EmbeddingGenerationBaseRequest>;
export declare namespace EmbeddingGenerationBaseRequest {
    interface Raw {
        registry_file_details?: RegistryFileDetail.Raw[] | null;
    }
}
