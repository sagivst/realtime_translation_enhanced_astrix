import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { CustomModelId } from "./CustomModelId.mjs";
import { CustomModelVersionId } from "./CustomModelVersionId.mjs";
export declare const CustomModel: core.serialization.Schema<serializers.expressionMeasurement.batch.CustomModel.Raw, Hume.expressionMeasurement.batch.CustomModel>;
export declare namespace CustomModel {
    type Raw = CustomModelId.Raw | CustomModelVersionId.Raw;
}
