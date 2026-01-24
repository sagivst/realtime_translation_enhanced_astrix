import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const OctaveVersion: core.serialization.Schema<serializers.tts.OctaveVersion.Raw, Hume.tts.OctaveVersion>;
export declare namespace OctaveVersion {
    type Raw = "1" | "2";
}
