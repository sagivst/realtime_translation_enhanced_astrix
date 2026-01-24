import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const PostedEventMessageSpec: core.serialization.ObjectSchema<serializers.empathicVoice.PostedEventMessageSpec.Raw, Hume.empathicVoice.PostedEventMessageSpec>;
export declare namespace PostedEventMessageSpec {
    interface Raw {
        enabled: boolean;
        text?: string | null;
    }
}
