import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { PostedEventMessageSpec } from "./PostedEventMessageSpec.js";
export declare const PostedEventMessageSpecs: core.serialization.ObjectSchema<serializers.empathicVoice.PostedEventMessageSpecs.Raw, Hume.empathicVoice.PostedEventMessageSpecs>;
export declare namespace PostedEventMessageSpecs {
    interface Raw {
        on_inactivity_timeout?: PostedEventMessageSpec.Raw | null;
        on_max_duration_timeout?: PostedEventMessageSpec.Raw | null;
        on_new_chat?: PostedEventMessageSpec.Raw | null;
    }
}
