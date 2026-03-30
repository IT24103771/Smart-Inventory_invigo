const API_BASE_URL = "http://localhost:8080/api";

const parseError = async (response, fallbackMessage) => {
    try {
        const data = await response.json();
        return data.message || data.error || fallbackMessage;
    } catch {
        try {
            const text = await response.text();
            return text || fallbackMessage;
        } catch {
            return fallbackMessage;
        }
    }
};

export const getProducts = async () => {
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to fetch products"));
    }
    return response.json();
};

export const getAvailableQuantity = async (productId) => {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/available-quantity`);
    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to fetch available quantity"));
    }

    // Your backend returns a raw integer, not { availableQuantity: ... }
    const data = await response.json();
    return Number(data ?? 0);
};

export const getSalesHistory = async () => {
    const response = await fetch(`${API_BASE_URL}/sales`);
    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to fetch sales history"));
    }

    const sales = await response.json();

    // Your backend SaleResponse is already flat:
    // {
    //   id, productId, productName, batchId, batchNumber, expiryDate,
    //   quantity, saleDate, createdAt
    // }
    return sales
        .map((s) => ({
            ...s,
            productId: String(s.productId),
            productName: s.productName,
            quantitySold: s.quantity,
            unitPrice: Number(s.unitPrice ?? 0), // not provided by backend yet
            lineTotal: Number(s.lineTotal ?? 0), // not provided by backend yet
            saleGroupId: String(s.id),
            status: "ACTIVE",
            recordedBy: s.recordedBy ?? "System",
        }))
        .sort(
            (a, b) =>
                new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime() ||
                b.id - a.id
        );
};

export const recordPosSale = async (request) => {
    // IMPORTANT:
    // Your current backend expects ONE sale at a time with:
    // { productId, batchId, quantity, saleDate }
    //
    // If the UI sends multiple items, we create them one by one.
    if (!request?.items || !Array.isArray(request.items) || request.items.length === 0) {
        throw new Error("No sale items provided");
    }

    const results = [];

    for (const item of request.items) {
        const payload = {
            productId: Number(item.productId),
            batchId: Number(item.batchId),
            quantity: Number(item.quantity),
            saleDate: request.saleDate,
        };

        if (!payload.productId) throw new Error("productId is required");
        if (!payload.batchId) throw new Error("batchId is required");
        if (!payload.quantity || payload.quantity <= 0) throw new Error("quantity must be greater than 0");
        if (!payload.saleDate) throw new Error("saleDate is required");

        const response = await fetch(`${API_BASE_URL}/sales`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(await parseError(response, "Failed to record sale"));
        }

        results.push(await response.json());
    }

    return results;
};

export const voidSale = async (saleId) => {
    const response = await fetch(`${API_BASE_URL}/sales/${saleId}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to delete sale"));
    }

    return true;
};

export const editSaleQuantity = async (saleId, updateData) => {
    // Your backend PUT expects the full CreateSaleRequest shape:
    // { productId, batchId, quantity, saleDate }
    const payload = {
        productId: Number(updateData.productId),
        batchId: Number(updateData.batchId),
        quantity: Number(updateData.quantity),
        saleDate: updateData.saleDate,
    };

    if (!payload.productId) throw new Error("productId is required for update");
    if (!payload.batchId) throw new Error("batchId is required for update");
    if (!payload.quantity || payload.quantity <= 0) throw new Error("quantity must be greater than 0");
    if (!payload.saleDate) throw new Error("saleDate is required for update");

    const response = await fetch(`${API_BASE_URL}/sales/${saleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to edit sale"));
    }

    return response.json();
};