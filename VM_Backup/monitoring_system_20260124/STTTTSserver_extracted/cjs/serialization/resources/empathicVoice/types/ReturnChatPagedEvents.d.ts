import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnChatEvent } from "./ReturnChatEvent.js";
import { ReturnChatPagedEventsPaginationDirection } from "./ReturnChatPagedEventsPaginationDirection.js";
import { ReturnChatPagedEventsStatus } from "./ReturnChatPagedEventsStatus.js";
import { ReturnConfigSpec } from "./ReturnConfigSpec.js";
export declare const ReturnChatPagedEvents: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnChatPagedEvents.Raw, Hume.empathicVoice.ReturnChatPagedEvents>;
export declare namespace ReturnChatPagedEvents {
    interface Raw {
        chat_group_id: string;
        config?: ReturnConfigSpec.Raw | null;
        end_timestamp?: number | null;
        events_page: ReturnChatEvent.Raw[];
        id: string;
        metadata?: string | null;
        page_number: number;
        page_size: number;
        pagination_direction: ReturnChatPagedEventsPaginationDirection.Raw;
        start_timestamp: number;
        status: ReturnChatPagedEventsStatus.Raw;
        total_pages: number;
    }
}
