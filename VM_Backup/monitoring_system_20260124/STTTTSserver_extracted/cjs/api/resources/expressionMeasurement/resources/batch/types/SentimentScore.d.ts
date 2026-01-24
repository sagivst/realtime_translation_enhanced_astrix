export interface SentimentScore {
    /** Level of sentiment, ranging from `1` (negative) to `9` (positive) */
    name: string;
    /** Prediction for this level of sentiment */
    score: number;
}
