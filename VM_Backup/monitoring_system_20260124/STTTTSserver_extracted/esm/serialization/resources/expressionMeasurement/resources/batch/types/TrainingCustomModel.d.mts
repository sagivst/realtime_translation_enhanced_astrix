import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const TrainingCustomModel: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.TrainingCustomModel.Raw, Hume.expressionMeasurement.batch.TrainingCustomModel>;
export declare namespace TrainingCustomModel {
    interface Raw {
        id: string;
        version_id?: string | null;
    }
}
