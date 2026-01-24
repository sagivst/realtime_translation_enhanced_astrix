import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Tag } from "./Tag.mjs";
export declare const CustomModelRequest: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.CustomModelRequest.Raw, Hume.expressionMeasurement.batch.CustomModelRequest>;
export declare namespace CustomModelRequest {
    interface Raw {
        name: string;
        description?: string | null;
        tags?: Tag.Raw[] | null;
    }
}
