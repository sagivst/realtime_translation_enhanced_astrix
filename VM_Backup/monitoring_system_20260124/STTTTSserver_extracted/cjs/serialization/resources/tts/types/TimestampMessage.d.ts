import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { Timestamp } from "./Timestamp.js";
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
