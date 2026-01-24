import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ReturnEllmModel: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnEllmModel.Raw, Hume.empathicVoice.ReturnEllmModel>;
export declare namespace ReturnEllmModel {
    interface Raw {
        allow_short_responses: boolean;
    }
}
