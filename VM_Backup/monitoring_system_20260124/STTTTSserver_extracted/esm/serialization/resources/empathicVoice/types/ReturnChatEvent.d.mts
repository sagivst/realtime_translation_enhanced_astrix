import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnChatEventRole } from "./ReturnChatEventRole.mjs";
import { ReturnChatEventType } from "./ReturnChatEventType.mjs";
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
