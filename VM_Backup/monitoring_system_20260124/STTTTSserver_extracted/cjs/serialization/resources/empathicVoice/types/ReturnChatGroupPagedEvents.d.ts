import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnChatEvent } from "./ReturnChatEvent.js";
import { ReturnChatGroupPagedEventsPaginationDirection } from "./ReturnChatGroupPagedEventsPaginationDirection.js";
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
