import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const PostedEllmModel: core.serialization.ObjectSchema<serializers.empathicVoice.PostedEllmModel.Raw, Hume.empathicVoice.PostedEllmModel>;
export declare namespace PostedEllmModel {
    interface Raw {
        allow_short_responses?: boolean | null;
    }
}
