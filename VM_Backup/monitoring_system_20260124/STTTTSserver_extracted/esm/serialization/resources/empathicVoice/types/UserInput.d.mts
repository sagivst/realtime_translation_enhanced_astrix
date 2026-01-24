import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const UserInput: core.serialization.ObjectSchema<serializers.empathicVoice.UserInput.Raw, Hume.empathicVoice.UserInput>;
export declare namespace UserInput {
    interface Raw {
        custom_session_id?: string | null;
        text: string;
        type: "user_input";
    }
}
