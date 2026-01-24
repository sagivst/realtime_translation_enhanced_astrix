"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Supplier = void 0;
exports.Supplier = {
    get: (supplier) => {
        if (typeof supplier === "function") {
            return supplier();
        }
        else {
            return supplier;
        }
    },
    map: (supplier, f) => {
        if (typeof supplier === "function") {
            return () => f(exports.Supplier.get(supplier));
        }
        else {
            return f(supplier);
        }
    },
};
