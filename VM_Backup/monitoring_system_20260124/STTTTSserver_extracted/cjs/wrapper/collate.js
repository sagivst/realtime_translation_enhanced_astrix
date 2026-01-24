"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncDelegator = (this && this.__asyncDelegator) || function (o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
};
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collate = collate;
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
function collate(source, groupBy, isFinal) {
    return __asyncGenerator(this, arguments, function* collate_1() {
        var _a, e_1, _b, _c;
        const buffers = new Map();
        const order = [];
        let current;
        const ensure = (k) => {
            if (!buffers.has(k)) {
                buffers.set(k, []);
                order.push(k);
            }
        };
        const flushGroup = function* (k) {
            const buf = buffers.get(k);
            if (!buf)
                return;
            for (const item of buf)
                yield item;
            buffers.delete(k);
        };
        const nextGroup = () => {
            // pop the next group in first-seen order that still has a buffer
            while (order.length && !buffers.has(order[0]))
                order.shift();
            return order.shift();
        };
        try {
            for (var _d = true, source_1 = __asyncValues(source), source_1_1; source_1_1 = yield __await(source_1.next()), _a = source_1_1.done, !_a; _d = true) {
                _c = source_1_1.value;
                _d = false;
                const item = _c;
                const k = groupBy(item);
                if (current === undefined)
                    current = k;
                ensure(k);
                buffers.get(k).push(item);
                // if we just saw the final item for the current group, flush it and advance
                if (k === current && isFinal(item)) {
                    yield __await(yield* __asyncDelegator(__asyncValues(flushGroup(current))));
                    current = nextGroup();
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = source_1.return)) yield __await(_b.call(source_1));
            }
            finally { if (e_1) throw e_1.error; }
        }
        // stream ended; flush remaining groups in first-seen order
        if (current !== undefined) {
            if (buffers.has(current))
                yield __await(yield* __asyncDelegator(__asyncValues(flushGroup(current))));
            while (true) {
                const k = nextGroup();
                if (k === undefined)
                    break;
                yield __await(yield* __asyncDelegator(__asyncValues(flushGroup(k))));
            }
        }
    });
}
