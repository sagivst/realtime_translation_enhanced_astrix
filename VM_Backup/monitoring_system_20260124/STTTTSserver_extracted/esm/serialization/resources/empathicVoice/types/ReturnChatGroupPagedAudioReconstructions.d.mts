import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnChatAudioReconstruction } from "./ReturnChatAudioReconstruction.mjs";
import { ReturnChatGroupPagedAudioReconstructionsPaginationDirection } from "./ReturnChatGroupPagedAudioReconstructionsPaginationDirection.mjs";
export declare const ReturnChatGroupPagedAudioReconstructions: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnChatGroupPagedAudioReconstructions.Raw, Hume.empathicVoice.ReturnChatGroupPagedAudioReconstructions>;
export declare namespace ReturnChatGroupPagedAudioReconstructions {
    interface Raw {
        audio_reconstructions_page: ReturnChatAudioReconstruction.Raw[];
        id: string;
        num_chats: number;
        page_number: number;
        page_size: number;
        pagination_direction: ReturnChatGroupPagedAudioReconstructionsPaginationDirection.Raw;
        total_pages: number;
        user_id: string;
    }
}
