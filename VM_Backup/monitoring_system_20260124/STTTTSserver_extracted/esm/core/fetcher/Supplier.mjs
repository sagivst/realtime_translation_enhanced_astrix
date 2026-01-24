export const Supplier = {
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
            return () => f(Supplier.get(supplier));
        }
        else {
            return f(supplier);
        }
    },
};
