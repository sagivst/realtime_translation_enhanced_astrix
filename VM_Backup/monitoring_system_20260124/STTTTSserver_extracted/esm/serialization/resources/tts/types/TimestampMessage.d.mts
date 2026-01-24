import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { Timestamp } from "./Timestamp.mjs";
export declare const TimestampMessage: core.serialization.ObjectSchema<serializers.tts.TimestampMessage.Raw, Hume.tts.TimestampMessage>;
export declare namespace TimestampMessage {
    interface Raw {
        generation_id: string;
        request_id: string;
        snippet_id: string;
        timestamp: Timestamp.Raw;
        type: "timestamp";
    }
}
