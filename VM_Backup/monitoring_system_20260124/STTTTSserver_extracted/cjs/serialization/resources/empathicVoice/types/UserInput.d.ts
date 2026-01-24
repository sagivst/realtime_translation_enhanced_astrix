import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const UserInput: core.serialization.ObjectSchema<serializers.empathicVoice.UserInput.Raw, Hume.empathicVoice.UserInput>;
export declare namespace UserInput {
    interface Raw {
        custom_session_id?: string | null;
        text: string;
        type: "user_input";
    }
}
