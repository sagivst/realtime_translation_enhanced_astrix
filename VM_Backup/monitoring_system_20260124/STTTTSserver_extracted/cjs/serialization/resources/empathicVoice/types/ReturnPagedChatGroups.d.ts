import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnChatGroup } from "./ReturnChatGroup.js";
import { ReturnPagedChatGroupsPaginationDirection } from "./ReturnPagedChatGroupsPaginationDirection.js";
export declare const ReturnPagedChatGroups: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnPagedChatGroups.Raw, Hume.empathicVoice.ReturnPagedChatGroups>;
export declare namespace ReturnPagedChatGroups {
    interface Raw {
        chat_groups_page: ReturnChatGroup.Raw[];
        page_number: number;
        page_size: number;
        pagination_direction: ReturnPagedChatGroupsPaginationDirection.Raw;
        total_pages: number;
    }
}
