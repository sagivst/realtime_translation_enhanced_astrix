import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { FormatMp3 } from "./FormatMp3.mjs";
import { FormatPcm } from "./FormatPcm.mjs";
import { FormatWav } from "./FormatWav.mjs";
export declare const Format: core.serialization.Schema<serializers.tts.Format.Raw, Hume.tts.Format>;
export declare namespace Format {
    type Raw = FormatMp3.Raw | FormatPcm.Raw | FormatWav.Raw;
}
