import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ReturnEllmModel: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnEllmModel.Raw, Hume.empathicVoice.ReturnEllmModel>;
export declare namespace ReturnEllmModel {
    interface Raw {
        allow_short_responses: boolean;
    }
}
