import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnChatAudioReconstruction } from "./ReturnChatAudioReconstruction.js";
import { ReturnChatGroupPagedAudioReconstructionsPaginationDirection } from "./ReturnChatGroupPagedAudioReconstructionsPaginationDirection.js";
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
