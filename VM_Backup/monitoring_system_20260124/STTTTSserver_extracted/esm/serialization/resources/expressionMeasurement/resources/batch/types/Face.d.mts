import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Unconfigurable } from "./Unconfigurable.mjs";
export declare const Face: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Face.Raw, Hume.expressionMeasurement.batch.Face>;
export declare namespace Face {
    interface Raw {
        fps_pred?: number | null;
        prob_threshold?: number | null;
        identify_faces?: boolean | null;
        min_face_size?: number | null;
        facs?: Unconfigurable.Raw | null;
        descriptions?: Unconfigurable.Raw | null;
        save_faces?: boolean | null;
    }
}
