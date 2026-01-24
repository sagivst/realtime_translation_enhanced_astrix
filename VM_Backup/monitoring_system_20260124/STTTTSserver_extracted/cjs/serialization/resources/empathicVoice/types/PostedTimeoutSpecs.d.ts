import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { PostedTimeoutSpecsInactivity } from "./PostedTimeoutSpecsInactivity.js";
import { PostedTimeoutSpecsMaxDuration } from "./PostedTimeoutSpecsMaxDuration.js";
export declare const PostedTimeoutSpecs: core.serialization.ObjectSchema<serializers.empathicVoice.PostedTimeoutSpecs.Raw, Hume.empathicVoice.PostedTimeoutSpecs>;
export declare namespace PostedTimeoutSpecs {
    interface Raw {
        inactivity?: PostedTimeoutSpecsInactivity.Raw | null;
        max_duration?: PostedTimeoutSpecsMaxDuration.Raw | null;
    }
}
