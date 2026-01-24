import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const PostedEllmModel: core.serialization.ObjectSchema<serializers.empathicVoice.PostedEllmModel.Raw, Hume.empathicVoice.PostedEllmModel>;
export declare namespace PostedEllmModel {
    interface Raw {
        allow_short_responses?: boolean | null;
    }
}
