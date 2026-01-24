import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
export declare const StreamFace: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamFace.Raw, Hume.expressionMeasurement.stream.StreamFace>;
export declare namespace StreamFace {
    interface Raw {
        facs?: Record<string, unknown> | null;
        descriptions?: Record<string, unknown> | null;
        identify_faces?: boolean | null;
        fps_pred?: number | null;
        prob_threshold?: number | null;
        min_face_size?: number | null;
    }
}
