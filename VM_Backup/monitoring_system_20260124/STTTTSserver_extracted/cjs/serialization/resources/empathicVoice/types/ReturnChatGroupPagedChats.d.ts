import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnChat } from "./ReturnChat.js";
import { ReturnChatGroupPagedChatsPaginationDirection } from "./ReturnChatGroupPagedChatsPaginationDirection.js";
export declare const ReturnChatGroupPagedChats: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnChatGroupPagedChats.Raw, Hume.empathicVoice.ReturnChatGroupPagedChats>;
export declare namespace ReturnChatGroupPagedChats {
    interface Raw {
        active?: boolean | null;
        chats_page: ReturnChat.Raw[];
        first_start_timestamp: number;
        id: string;
        most_recent_start_timestamp: number;
        num_chats: number;
        page_number: number;
        page_size: number;
        pagination_direction: ReturnChatGroupPagedChatsPaginationDirection.Raw;
        total_pages: number;
    }
}
