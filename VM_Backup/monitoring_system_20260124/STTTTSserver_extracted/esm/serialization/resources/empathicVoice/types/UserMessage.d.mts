import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ChatMessage } from "./ChatMessage.mjs";
import { Inference } from "./Inference.mjs";
import { MillisecondInterval } from "./MillisecondInterval.mjs";
export declare const UserMessage: core.serialization.ObjectSchema<serializers.empathicVoice.UserMessage.Raw, Hume.empathicVoice.UserMessage>;
export declare namespace UserMessage {
    interface Raw {
        custom_session_id?: string | null;
        from_text: boolean;
        interim: boolean;
        language?: string | null;
        message: ChatMessage.Raw;
        models: Inference.Raw;
        time: MillisecondInterval.Raw;
        type: "user_message";
    }
}
