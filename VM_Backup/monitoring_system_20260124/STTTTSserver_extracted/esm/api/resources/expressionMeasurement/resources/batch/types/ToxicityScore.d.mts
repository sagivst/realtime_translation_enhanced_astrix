export interface ToxicityScore {
    /** Category of toxicity. */
    name: string;
    /** Prediction for this category of toxicity */
    score: number;
}
