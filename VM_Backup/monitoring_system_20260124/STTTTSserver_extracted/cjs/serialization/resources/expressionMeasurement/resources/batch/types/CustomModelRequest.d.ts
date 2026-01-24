import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { Tag } from "./Tag.js";
export declare const CustomModelRequest: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.CustomModelRequest.Raw, Hume.expressionMeasurement.batch.CustomModelRequest>;
export declare namespace CustomModelRequest {
    interface Raw {
        name: string;
        description?: string | null;
        tags?: Tag.Raw[] | null;
    }
}
