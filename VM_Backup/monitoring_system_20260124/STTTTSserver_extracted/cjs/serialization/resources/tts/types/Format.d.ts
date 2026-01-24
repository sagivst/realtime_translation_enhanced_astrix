import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { FormatMp3 } from "./FormatMp3.js";
import { FormatPcm } from "./FormatPcm.js";
import { FormatWav } from "./FormatWav.js";
export declare const Format: core.serialization.Schema<serializers.tts.Format.Raw, Hume.tts.Format>;
export declare namespace Format {
    type Raw = FormatMp3.Raw | FormatPcm.Raw | FormatWav.Raw;
}
