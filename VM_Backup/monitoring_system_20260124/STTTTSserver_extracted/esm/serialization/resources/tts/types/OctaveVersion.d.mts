import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const OctaveVersion: core.serialization.Schema<serializers.tts.OctaveVersion.Raw, Hume.tts.OctaveVersion>;
export declare namespace OctaveVersion {
    type Raw = "1" | "2";
}
