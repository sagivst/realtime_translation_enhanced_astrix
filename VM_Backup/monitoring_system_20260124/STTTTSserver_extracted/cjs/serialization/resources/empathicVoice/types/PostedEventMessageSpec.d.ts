import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const PostedEventMessageSpec: core.serialization.ObjectSchema<serializers.empathicVoice.PostedEventMessageSpec.Raw, Hume.empathicVoice.PostedEventMessageSpec>;
export declare namespace PostedEventMessageSpec {
    interface Raw {
        enabled: boolean;
        text?: string | null;
    }
}
