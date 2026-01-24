import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnChatEvent } from "./ReturnChatEvent.mjs";
import { ReturnChatGroupPagedEventsPaginationDirection } from "./ReturnChatGroupPagedEventsPaginationDirection.mjs";
export declare const ReturnChatGroupPagedEvents: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnChatGroupPagedEvents.Raw, Hume.empathicVoice.ReturnChatGroupPagedEvents>;
export declare namespace ReturnChatGroupPagedEvents {
    interface Raw {
        events_page: ReturnChatEvent.Raw[];
        id: string;
        page_number: number;
        page_size: number;
        pagination_direction: ReturnChatGroupPagedEventsPaginationDirection.Raw;
        total_pages: number;
    }
}
