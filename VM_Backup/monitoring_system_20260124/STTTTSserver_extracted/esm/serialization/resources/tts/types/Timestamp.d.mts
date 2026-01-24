import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { MillisecondInterval } from "./MillisecondInterval.mjs";
import { TimestampType } from "./TimestampType.mjs";
export declare const Timestamp: core.serialization.ObjectSchema<serializers.tts.Timestamp.Raw, Hume.tts.Timestamp>;
export declare namespace Timestamp {
    interface Raw {
        text: string;
        time: MillisecondInterval.Raw;
        type: TimestampType.Raw;
    }
}
