import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { CustomModelId } from "./CustomModelId.js";
import { CustomModelVersionId } from "./CustomModelVersionId.js";
export declare const CustomModel: core.serialization.Schema<serializers.expressionMeasurement.batch.CustomModel.Raw, Hume.expressionMeasurement.batch.CustomModel>;
export declare namespace CustomModel {
    type Raw = CustomModelId.Raw | CustomModelVersionId.Raw;
}
