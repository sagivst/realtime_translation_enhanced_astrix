import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { MillisecondInterval } from "./MillisecondInterval.js";
import { TimestampType } from "./TimestampType.js";
export declare const Timestamp: core.serialization.ObjectSchema<serializers.tts.Timestamp.Raw, Hume.tts.Timestamp>;
export declare namespace Timestamp {
    interface Raw {
        text: string;
        time: MillisecondInterval.Raw;
        type: TimestampType.Raw;
    }
}
