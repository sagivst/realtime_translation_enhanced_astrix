/**
 * Takes an async iterator that yields interleaved items from different groups
 * and produces an iterator that yields items in group order.
 *
 * Example:
 *   Input:  A1, B1, A2, A3 (final), C1, C2, C3 (final), B2 (final)
 *   Output: A1, A2, A3, B1, B2, C1, C2, C3
 *
 * This is useful when using synthesizeJsonStreaming with num_generations > 1
 *
 * @example
 * ```typescript
 *
 * import { collate } from 'hume';
 *
 * const stream = hume.synthesizeJsonStreaming({
 *   ...
 * })
 *
 * const contiguous = collate(
 *   stream
 *   (chunk) => chunk.generationId,
 *   (chunk) => chunk.isLastChunk
 * );
 *
 * for await (const item of contiguous) {
 *   audioPlayer.write(item.audio)
 * }
 * ```
 *
 * @param source - Async iterable that yields interleaved items.
 * @param groupBy - Function to determine a "key" that determines the group identity for each item.
 * @param isFinal - Function to determine if an item is the final item in its group.
 * @returns An async iterable that yields items in group order.
 */
export declare function collate<TItem, TKey>(source: AsyncIterable<TItem>, groupBy: (x: TItem) => TKey, isFinal: (x: TItem) => boolean): AsyncIterable<TItem>;
