import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const UserInterruption: core.serialization.ObjectSchema<serializers.empathicVoice.UserInterruption.Raw, Hume.empathicVoice.UserInterruption>;
export declare namespace UserInterruption {
    interface Raw {
        custom_session_id?: string | null;
        time: number;
        type: "user_interruption";
    }
}
