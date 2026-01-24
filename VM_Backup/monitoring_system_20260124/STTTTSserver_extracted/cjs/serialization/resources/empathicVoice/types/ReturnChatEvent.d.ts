import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnChatEventRole } from "./ReturnChatEventRole.js";
import { ReturnChatEventType } from "./ReturnChatEventType.js";
export declare const ReturnChatEvent: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnChatEvent.Raw, Hume.empathicVoice.ReturnChatEvent>;
export declare namespace ReturnChatEvent {
    interface Raw {
        chat_id: string;
        emotion_features?: string | null;
        id: string;
        message_text?: string | null;
        metadata?: string | null;
        related_event_id?: string | null;
        role: ReturnChatEventRole.Raw;
        timestamp: number;
        type: ReturnChatEventType.Raw;
    }
}
