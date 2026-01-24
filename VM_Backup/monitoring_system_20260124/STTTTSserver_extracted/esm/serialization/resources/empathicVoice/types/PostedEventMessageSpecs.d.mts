import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { PostedEventMessageSpec } from "./PostedEventMessageSpec.mjs";
export declare const PostedEventMessageSpecs: core.serialization.ObjectSchema<serializers.empathicVoice.PostedEventMessageSpecs.Raw, Hume.empathicVoice.PostedEventMessageSpecs>;
export declare namespace PostedEventMessageSpecs {
    interface Raw {
        on_inactivity_timeout?: PostedEventMessageSpec.Raw | null;
        on_max_duration_timeout?: PostedEventMessageSpec.Raw | null;
        on_new_chat?: PostedEventMessageSpec.Raw | null;
    }
}
