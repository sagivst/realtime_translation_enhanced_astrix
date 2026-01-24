import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const UserInterruption: core.serialization.ObjectSchema<serializers.empathicVoice.UserInterruption.Raw, Hume.empathicVoice.UserInterruption>;
export declare namespace UserInterruption {
    interface Raw {
        custom_session_id?: string | null;
        time: number;
        type: "user_interruption";
    }
}
