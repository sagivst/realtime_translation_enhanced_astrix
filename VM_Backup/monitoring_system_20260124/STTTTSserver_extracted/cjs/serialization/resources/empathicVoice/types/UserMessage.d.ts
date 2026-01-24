import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ChatMessage } from "./ChatMessage.js";
import { Inference } from "./Inference.js";
import { MillisecondInterval } from "./MillisecondInterval.js";
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
