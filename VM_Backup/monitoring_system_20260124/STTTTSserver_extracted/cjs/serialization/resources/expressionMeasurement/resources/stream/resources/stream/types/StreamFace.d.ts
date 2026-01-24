import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
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
