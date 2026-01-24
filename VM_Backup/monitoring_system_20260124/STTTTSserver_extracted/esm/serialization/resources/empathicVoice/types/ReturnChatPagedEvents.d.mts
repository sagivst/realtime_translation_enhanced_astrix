import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnChatEvent } from "./ReturnChatEvent.mjs";
import { ReturnChatPagedEventsPaginationDirection } from "./ReturnChatPagedEventsPaginationDirection.mjs";
import { ReturnChatPagedEventsStatus } from "./ReturnChatPagedEventsStatus.mjs";
import { ReturnConfigSpec } from "./ReturnConfigSpec.mjs";
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
