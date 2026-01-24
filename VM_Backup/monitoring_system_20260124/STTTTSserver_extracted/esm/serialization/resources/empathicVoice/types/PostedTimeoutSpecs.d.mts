import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { PostedTimeoutSpecsInactivity } from "./PostedTimeoutSpecsInactivity.mjs";
import { PostedTimeoutSpecsMaxDuration } from "./PostedTimeoutSpecsMaxDuration.mjs";
export declare const PostedTimeoutSpecs: core.serialization.ObjectSchema<serializers.empathicVoice.PostedTimeoutSpecs.Raw, Hume.empathicVoice.PostedTimeoutSpecs>;
export declare namespace PostedTimeoutSpecs {
    interface Raw {
        inactivity?: PostedTimeoutSpecsInactivity.Raw | null;
        max_duration?: PostedTimeoutSpecsMaxDuration.Raw | null;
    }
}
