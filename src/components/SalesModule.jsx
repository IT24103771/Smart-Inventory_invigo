import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    ShoppingCart,
    Clock,
    Edit2,
    Trash2,
    Plus,
    CheckCircle2,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const API_BASE_URL = "http://localhost:8080/api";

const todayStr = () => new Date().toISOString().split("T")[0];

const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const money = (value) => `Rs ${toNumber(value).toFixed(2)}`;

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

const normalizeProduct = (p) => ({
    ...p,
    id: p.id ?? p.productId,
    name: p.name ?? p.productName,
    category: p.category ?? p.mainCategory,
    displayPrice: toNumber(p?.sellingPrice ?? p?.price ?? 0),
});

const normalizeSale = (sale, productsMap) => {
    const product = productsMap.get(String(sale.productId)) || null;
    const unitPrice = toNumber(
        sale.unitPrice ??
        sale.sellingPrice ??
        sale.price ??
        product?.sellingPrice ??
        product?.price ??
        0
    );

    const quantitySold = toNumber(sale.quantitySold ?? sale.quantity ?? 0);
    const lineTotal = toNumber(sale.lineTotal ?? unitPrice * quantitySold);
    const saleDate = sale.saleDate ?? sale.date ?? "";
    const productName =
        sale.productName ??
        product?.name ??
        `Product #${sale.productId ?? sale.id ?? ""}`;

    return {
        ...sale,
        productName,
        quantitySold,
        unitPrice,
        lineTotal,
        saleDate,
        recordedBy: sale.recordedBy ?? sale.createdBy ?? "System",
        saleGroupId: sale.saleGroupId ?? String(sale.id),
        status: sale.status ?? "ACTIVE",
    };
};

const createEmptyItem = () => ({
    id: crypto.randomUUID?.() || String(Date.now() + Math.random()),
    productId: "",
    batchId: "",
    quantity: "",
});

export default function SalesModule({ role }) {
    const { toast } = useToast();

    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);

    const [items, setItems] = useState([createEmptyItem()]);
    const [saleDate, setSaleDate] = useState(todayStr());
    const [notes, setNotes] = useState("");

    const [batchesByProduct, setBatchesByProduct] = useState({});
    const [loadingBatches, setLoadingBatches] = useState({});

    const [editOpen, setEditOpen] = useState(false);
    const [editData, setEditData] = useState(null);

    const [billOpen, setBillOpen] = useState(false);
    const [selectedBillId, setSelectedBillId] = useState(null);

    const [filterSearch, setFilterSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [filterDate, setFilterDate] = useState("");
    const [sortBy, setSortBy] = useState("NEWEST");

    const productsMap = useMemo(
        () => new Map(products.map((p) => [String(p.id), p])),
        [products]
    );

    const fetchProducts = async () => {
        const response = await fetch(`${API_BASE_URL}/products`);
        if (!response.ok) {
            throw new Error(await parseError(response, "Failed to fetch products"));
        }
        const data = await response.json();
        return (Array.isArray(data) ? data : []).map(normalizeProduct);
    };

    const fetchSales = async (currentProducts) => {
        const response = await fetch(`${API_BASE_URL}/sales`);
        if (!response.ok) {
            throw new Error(await parseError(response, "Failed to fetch sales history"));
        }
        const salesData = await response.json();
        const currentProductsMap = new Map(currentProducts.map((p) => [String(p.id), p]));
        return (Array.isArray(salesData) ? salesData : []).map((s) => normalizeSale(s, currentProductsMap));
    };

    const fetchBatchesByProduct = async (productId) => {
        if (!productId) return [];
        const response = await fetch(`${API_BASE_URL}/inventory/by-product/${productId}`);
        if (!response.ok) {
            throw new Error(await parseError(response, "Failed to fetch batches"));
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    };

    const refreshData = async () => {
        try {
            const fetchedProducts = await fetchProducts();
            setProducts(fetchedProducts);

            const fetchedSales = await fetchSales(fetchedProducts);
            setSales(fetchedSales);
        } catch (error) {
            toast({
                title: "Error loading data",
                description: error?.message || "Failed to load sales data",
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        refreshData();
    }, []);

    const ensureBatchesLoaded = async (productId) => {
        if (!productId) return [];
        const key = String(productId);

        if (batchesByProduct[key]) {
            return batchesByProduct[key];
        }

        try {
            setLoadingBatches((prev) => ({ ...prev, [key]: true }));
            const batches = await fetchBatchesByProduct(productId);

            setBatchesByProduct((prev) => ({
                ...prev,
                [key]: batches,
            }));

            return batches;
        } catch {
            setBatchesByProduct((prev) => ({
                ...prev,
                [key]: [],
            }));
            return [];
        } finally {
            setLoadingBatches((prev) => ({ ...prev, [key]: false }));
        }
    };

    const getProductById = (productId) => productsMap.get(String(productId)) || null;

    const getBatchesForProduct = (productId) => {
        if (!productId) return [];
        return batchesByProduct[String(productId)] || [];
    };

    const getBatchForItem = (item) => {
        const batches = getBatchesForProduct(item.productId);
        return batches.find((b) => String(b.id) === String(item.batchId)) || null;
    };

    const todaySales = useMemo(
        () => sales.filter((s) => s.saleDate === todayStr()),
        [sales]
    );

    const todayCount = todaySales.length;
    const todayQuantity = todaySales.reduce((acc, curr) => acc + toNumber(curr.quantitySold), 0);

    const displaySales = useMemo(() => {
        const filtered = [...sales].filter((s) => {
            const matchesSearch =
                !filterSearch ||
                String(s.productName).toLowerCase().includes(filterSearch.toLowerCase()) ||
                String(s.saleGroupId).toLowerCase().includes(filterSearch.toLowerCase()) ||
                String(s.recordedBy).toLowerCase().includes(filterSearch.toLowerCase()) ||
                String(s.batchNumber ?? "").toLowerCase().includes(filterSearch.toLowerCase());

            const matchesStatus = filterStatus === "ALL" || s.status === filterStatus;
            const matchesDate = !filterDate || s.saleDate === filterDate;

            return matchesSearch && matchesStatus && matchesDate;
        });

        filtered.sort((a, b) => {
            if (sortBy === "OLDEST") return new Date(a.saleDate || 0) - new Date(b.saleDate || 0);
            if (sortBy === "QTY_HIGH") return toNumber(b.quantitySold) - toNumber(a.quantitySold);
            if (sortBy === "QTY_LOW") return toNumber(a.quantitySold) - toNumber(b.quantitySold);
            return new Date(b.saleDate || 0) - new Date(a.saleDate || 0);
        });

        return filtered;
    }, [sales, filterSearch, filterStatus, filterDate, sortBy]);

    const selectedBillLines = useMemo(() => {
        if (!selectedBillId) return [];
        return sales.filter((s) => String(s.saleGroupId ?? s.id) === String(selectedBillId));
    }, [sales, selectedBillId]);

    const selectedBillTotal = selectedBillLines.reduce((sum, s) => sum + toNumber(s.lineTotal), 0);

    const lineTotals = items.map((item) => {
        const product = getProductById(item.productId);
        const qty = toNumber(item.quantity, 0);
        const unitPrice = toNumber(product?.displayPrice ?? product?.price ?? 0);
        return unitPrice * qty;
    });

    const grandTotal = lineTotals.reduce((sum, value) => sum + value, 0);

    const resetForm = () => {
        setItems([createEmptyItem()]);
        setSaleDate(todayStr());
        setNotes("");
    };

    const addLine = () => {
        setItems((prev) => [...prev, createEmptyItem()]);
    };

    const openBillDetails = (billId) => {
        setSelectedBillId(String(billId));
        setBillOpen(true);
    };

    const openEdit = async (sale) => {
        if (sale.productId) {
            await ensureBatchesLoaded(sale.productId);
        }

        setEditData({
            id: sale.id,
            productId: String(sale.productId ?? ""),
            batchId: String(sale.batchId ?? ""),
            quantitySold: String(sale.quantitySold ?? sale.quantity ?? ""),
            saleDate: sale.saleDate ?? todayStr(),
        });
        setEditOpen(true);
    };

    const handleProductChange = async (itemId, productId) => {
        setItems((prev) =>
            prev.map((i) =>
                i.id === itemId
                    ? { ...i, productId, batchId: "", quantity: "" }
                    : i
            )
        );

        if (productId) {
            await ensureBatchesLoaded(productId);
        }
    };

    const handleBatchChange = (itemId, batchId) => {
        setItems((prev) =>
            prev.map((i) =>
                i.id === itemId
                    ? { ...i, batchId, quantity: "" }
                    : i
            )
        );
    };

    const handleQuantityChange = (itemId, quantity) => {
        setItems((prev) =>
            prev.map((i) =>
                i.id === itemId
                    ? { ...i, quantity }
                    : i
            )
        );
    };

    const validateItems = () => {
        const cleanedItems = items.map((item) => {
            const batch = getBatchForItem(item);
            return {
                ...item,
                quantity: toNumber(item.quantity, 0),
                batch,
            };
        });

        for (const item of cleanedItems) {
            if (!item.productId) {
                throw new Error("Please select a product for every line.");
            }
            if (!item.batchId) {
                throw new Error("Please select a batch for every line.");
            }
            if (!item.quantity || item.quantity <= 0) {
                throw new Error("Quantity must be at least 1.");
            }

            const batchQty = toNumber(item.batch?.quantity, 0);
            if (item.quantity > batchQty) {
                throw new Error(`Not enough stock in selected batch. Available: ${batchQty}`);
            }

            if (item.batch?.status === "Expired") {
                throw new Error("Cannot sell an expired batch.");
            }

            if (item.batch?.expiryDate && item.saleDate) {
                const exp = new Date(item.batch.expiryDate);
                const saleDt = new Date(saleDate);
                if (exp < new Date(saleDt.toISOString().slice(0, 10))) {
                    throw new Error("Cannot sell from an expired batch.");
                }
            }
        }

        return cleanedItems.filter((item) => item.productId && item.batchId && item.quantity > 0);
    };

    const handleRecordSale = async (e) => {
        e.preventDefault();

        let cleanedItems;
        try {
            cleanedItems = validateItems();
        } catch (error) {
            toast({
                title: "Failed to record sale",
                description: error?.message || "Please check the form.",
                variant: "destructive",
            });
            return;
        }

        if (cleanedItems.length === 0) {
            toast({
                title: "No items",
                description: "Add at least one valid product, batch, and quantity.",
                variant: "destructive",
            });
            return;
        }

        try {
            for (const item of cleanedItems) {
                const payload = {
                    productId: Number(item.productId),
                    batchId: Number(item.batchId),
                    quantity: Number(item.quantity),
                    saleDate,
                };

                const response = await fetch(`${API_BASE_URL}/sales`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error(await parseError(response, "Could not save sale."));
                }
            }

            toast({
                title: "Sale recorded",
                description: "The sale was saved successfully.",
            });

            resetForm();
            await refreshData();
        } catch (error) {
            toast({
                title: "Failed to record sale",
                description: error?.message || "Could not save sale.",
                variant: "destructive",
            });
        }
    };

    const handleVoidSale = async (saleId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/sales/${saleId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error(await parseError(response, "Could not delete sale."));
            }

            toast({
                title: "Sale removed",
                description: "The sale was deleted successfully.",
            });

            await refreshData();
        } catch (error) {
            toast({
                title: "Failed to remove sale",
                description: error?.message || "Could not delete sale.",
                variant: "destructive",
            });
        }
    };

    const handleEditSale = async () => {
        if (!editData?.id) return;

        try {
            const payload = {
                productId: Number(editData.productId),
                batchId: Number(editData.batchId),
                quantity: Number(editData.quantitySold),
                saleDate: editData.saleDate,
            };

            if (!payload.productId || !payload.batchId || !payload.quantity || !payload.saleDate) {
                throw new Error("Product, batch, quantity, and sale date are required.");
            }

            const response = await fetch(`${API_BASE_URL}/sales/${editData.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(await parseError(response, "Could not update sale."));
            }

            toast({
                title: "Sale updated",
                description: "The quantity was updated successfully.",
            });

            setEditOpen(false);
            setEditData(null);
            await refreshData();
        } catch (error) {
            toast({
                title: "Failed to update sale",
                description: error?.message || "Could not update sale.",
                variant: "destructive",
            });
        }
    };

    const isDark = false;
    const isStaff = role === "Staff";
    const isAdmin = role === "Admin";

    const bgCard = isStaff
        ? "card-premium border-none shadow-[0_8px_30px_rgb(78,52,46,0.04)] bg-[#F9F5EC]"
        : "card-premium border-none shadow-premium bg-white";
    const textLabel = isStaff ? "text-[#4E342E]/50" : "text-[#0F172A]/40";
    const textValue = isStaff ? "text-[#4E342E]" : "text-[#0F172A]";
    const inputBg = isStaff
        ? "bg-[#F5EBE1] border-[#4E342E]/10 placeholder:text-[#4E342E]/30"
        : "bg-white border-gray-200 placeholder:text-[#0F172A]/30";

    return (
        <div className="space-y-10">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${bgCard} p-6 rounded-[2rem]`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-2xl bg-[#007A5E]/10 text-[#007A5E]">
                            <ShoppingCart size={24} />
                        </div>
                    </div>
                    <p className={`text-xs font-black uppercase tracking-widest ${textLabel} mb-1`}>Today's Transactions</p>
                    <h3 className={`text-4xl font-black ${textValue}`}>{todayCount}</h3>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${bgCard} p-6 rounded-[2rem]`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-2xl bg-[#7C3AED]/10 text-[#7C3AED]">
                            <Clock size={24} />
                        </div>
                    </div>
                    <p className={`text-xs font-black uppercase tracking-widest ${textLabel} mb-1`}>Units Sold Today</p>
                    <h3 className={`text-4xl font-black ${textValue}`}>{todayQuantity}</h3>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${bgCard} p-6 rounded-[2rem]`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-2xl bg-[#F59E0B]/10 text-[#F59E0B]">
                            <CheckCircle2 size={24} />
                        </div>
                    </div>
                    <p className={`text-xs font-black uppercase tracking-widest ${textLabel} mb-1`}>Today Revenue</p>
                    <h3 className={`text-4xl font-black ${textValue}`}>
                        {money(todaySales.reduce((sum, s) => sum + toNumber(s.lineTotal), 0))}
                    </h3>
                </motion.div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-4">
                    <Card className={`${bgCard} p-0 overflow-hidden`}>
                        <CardHeader className={`p-6 border-b ${isDark ? "border-white/5" : "border-[#0F172A]/5"}`}>
                            <CardTitle className={`font-black text-xl ${textValue}`}>Record New Sale</CardTitle>
                            <CardDescription className="font-bold">
                                Add one or more product lines with batch selection.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-6 space-y-4">
                            <form onSubmit={handleRecordSale} className="space-y-4">
                                <div className="space-y-3">
                                    {items.map((item, index) => {
                                        const product = getProductById(item.productId);
                                        const batches = getBatchesForProduct(item.productId);
                                        const selectedBatch = getBatchForItem(item);
                                        const currentStock = toNumber(selectedBatch?.quantity, 0);
                                        const lineTotal = toNumber(product?.displayPrice ?? 0) * toNumber(item.quantity, 0);
                                        const batchLoading = !!loadingBatches[String(item.productId)];

                                        return (
                                            <div key={item.id} className="rounded-2xl border border-gray-200/60 p-3 space-y-3 bg-white/40">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>
                                                        Line {index + 1}
                                                    </Label>

                                                    {items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                                                            className="text-[10px] font-black uppercase tracking-widest text-red-500"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    <Select
                                                        value={item.productId}
                                                        onValueChange={(val) => handleProductChange(item.id, val)}
                                                    >
                                                        <SelectTrigger className={`rounded-2xl h-10 font-bold ${inputBg}`}>
                                                            <SelectValue placeholder="Choose product..." />
                                                        </SelectTrigger>
                                                        <SelectContent className={`rounded-2xl ${isDark ? "bg-[#0F172A] text-white border-white/10" : ""}`}>
                                                            {products.map((p) => (
                                                                <SelectItem key={p.id} value={String(p.id)}>
                                                                    {p.name} — {money(p.displayPrice)}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    <Select
                                                        value={item.batchId}
                                                        onValueChange={(val) => handleBatchChange(item.id, val)}
                                                        disabled={!item.productId || batchLoading}
                                                    >
                                                        <SelectTrigger className={`rounded-2xl h-10 font-bold ${inputBg}`}>
                                                            <SelectValue placeholder={!item.productId ? "Select product first" : batchLoading ? "Loading batches..." : "Choose batch..."} />
                                                        </SelectTrigger>
                                                        <SelectContent className={`rounded-2xl ${isDark ? "bg-[#0F172A] text-white border-white/10" : ""}`}>
                                                            {batches.map((b) => (
                                                                <SelectItem key={b.id} value={String(b.id)}>
                                                                    {b.batchNumber} • Exp: {b.expiryDate} • Qty: {b.quantity}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            max={currentStock || 1}
                                                            className={`rounded-2xl h-10 ${inputBg}`}
                                                            placeholder="Qty"
                                                            value={item.quantity}
                                                            disabled={!item.batchId}
                                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                        />

                                                        <div className={`text-xs font-bold ${textLabel} min-w-[110px]`}>
                                                            Stock: {currentStock}
                                                        </div>
                                                    </div>

                                                    {item.batchId && (
                                                        <div className="text-xs space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className={textLabel}>Batch</span>
                                                                <span className={`font-black ${textValue}`}>
                                                                    {selectedBatch?.batchNumber || "-"}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className={textLabel}>Expiry</span>
                                                                <span className={`font-black ${textValue}`}>
                                                                    {selectedBatch?.expiryDate || "-"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className={textLabel}>Unit Price</span>
                                                        <span className={`font-black ${textValue}`}>{money(product?.displayPrice ?? 0)}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className={textLabel}>Line Total</span>
                                                        <span className={`font-black ${textValue}`}>{money(lineTotal)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <Button type="button" variant="outline" onClick={addLine} className="w-full rounded-2xl font-black">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Another Line
                                </Button>

                                <div className="space-y-2">
                                    <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>Sale Date</Label>
                                    <Input
                                        type="date"
                                        className={`rounded-2xl h-10 ${inputBg}`}
                                        value={saleDate}
                                        onChange={(e) => setSaleDate(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>Notes</Label>
                                    <Input
                                        className={`rounded-2xl h-10 ${inputBg}`}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Optional note"
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-gray-200/70">
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>Grand Total</p>
                                        <p className={`text-2xl font-black ${textValue}`}>{money(grandTotal)}</p>
                                    </div>

                                    <Button type="submit" className="rounded-2xl font-black">
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Save Sale
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <Card className={`${bgCard} p-0 overflow-hidden`}>
                        <CardHeader className={`p-6 border-b ${isDark ? "border-white/5" : "border-[#0F172A]/5"}`}>
                            <CardTitle className={`font-black text-xl ${textValue}`}>Sales History</CardTitle>
                            <CardDescription className="font-bold">
                                Browse and manage recorded sales.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-6 space-y-4">
                            <div className="grid md:grid-cols-4 gap-3">
                                <Input
                                    className={`rounded-2xl h-10 ${inputBg}`}
                                    placeholder="Search product / batch / bill / user"
                                    value={filterSearch}
                                    onChange={(e) => setFilterSearch(e.target.value)}
                                />

                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className={`rounded-2xl h-10 ${inputBg}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Status</SelectItem>
                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                        <SelectItem value="VOID">Void</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Input
                                    type="date"
                                    className={`rounded-2xl h-10 ${inputBg}`}
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                />

                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className={`rounded-2xl h-10 ${inputBg}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NEWEST">Newest</SelectItem>
                                        <SelectItem value="OLDEST">Oldest</SelectItem>
                                        <SelectItem value="QTY_HIGH">Qty High-Low</SelectItem>
                                        <SelectItem value="QTY_LOW">Qty Low-High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="rounded-2xl border border-gray-200/70 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="px-6 font-black uppercase text-[10px] tracking-widest">Bill</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Product</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Batch</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Qty</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Total</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                                            {isAdmin && <TableHead className="text-right px-6 font-black uppercase text-[10px] tracking-widest">Action</TableHead>}
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {displaySales.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-12">
                                                    <p className={`${textLabel} font-bold text-sm`}>No sales found.</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            displaySales.map((sale) => (
                                                <TableRow
                                                    key={sale.id}
                                                    className={`${isStaff ? "border-[#4E342E]/5 hover:bg-[#4E342E]/[0.02]" : "border-[#0F172A]/5 hover:bg-primary/[0.03]"} transition-colors`}
                                                >
                                                    <TableCell className="px-6 py-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => openBillDetails(sale.saleGroupId ?? String(sale.id))}
                                                            className="text-left"
                                                        >
                                                            <p className={`font-black text-[11px] ${textValue}`}>{sale.saleGroupId ?? sale.id}</p>
                                                            <p className={`text-[10px] font-bold ${textLabel} uppercase`}>Line #{sale.id}</p>
                                                        </button>
                                                    </TableCell>

                                                    <TableCell>
                                                        <p className={`font-black ${textValue}`}>{sale.productName}</p>
                                                        <p className={`text-[10px] font-bold ${textLabel} uppercase`}>
                                                            ID: {sale.id} • User: {sale.recordedBy}
                                                        </p>
                                                    </TableCell>

                                                    <TableCell>
                                                        <p className={`font-black ${textValue}`}>{sale.batchNumber || "-"}</p>
                                                        <p className={`text-[10px] font-bold ${textLabel} uppercase`}>
                                                            {sale.expiryDate ? `Exp: ${sale.expiryDate}` : ""}
                                                        </p>
                                                    </TableCell>

                                                    <TableCell className="font-bold text-lg">{sale.quantitySold}</TableCell>
                                                    <TableCell className="font-bold text-sm">{money(sale.lineTotal)}</TableCell>
                                                    <TableCell className={`font-bold text-sm ${textLabel}`}>{sale.saleDate}</TableCell>

                                                    {isAdmin && (
                                                        <TableCell className="text-right px-6">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => openEdit(sale)}
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                </Button>

                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleVoidSale(sale.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle>Edit Sale</DialogTitle>
                        <DialogDescription>Update product, batch, quantity, or date.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Product</Label>
                            <Select
                                value={editData?.productId ?? ""}
                                onValueChange={async (val) => {
                                    await ensureBatchesLoaded(val);
                                    setEditData((prev) => ({
                                        ...prev,
                                        productId: val,
                                        batchId: "",
                                    }));
                                }}
                            >
                                <SelectTrigger className="rounded-2xl h-10">
                                    <SelectValue placeholder="Choose product..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.name} — {money(p.displayPrice)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Batch</Label>
                            <Select
                                value={editData?.batchId ?? ""}
                                onValueChange={(val) =>
                                    setEditData((prev) => ({ ...prev, batchId: val }))
                                }
                            >
                                <SelectTrigger className="rounded-2xl h-10">
                                    <SelectValue placeholder="Choose batch..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {(batchesByProduct[String(editData?.productId)] || []).map((b) => (
                                        <SelectItem key={b.id} value={String(b.id)}>
                                            {b.batchNumber} • Exp: {b.expiryDate} • Qty: {b.quantity}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input
                                type="number"
                                min="1"
                                value={editData?.quantitySold ?? ""}
                                onChange={(e) =>
                                    setEditData((prev) => ({ ...prev, quantitySold: e.target.value }))
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Sale Date</Label>
                            <Input
                                type="date"
                                value={editData?.saleDate ?? ""}
                                onChange={(e) =>
                                    setEditData((prev) => ({ ...prev, saleDate: e.target.value }))
                                }
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleEditSale}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={billOpen} onOpenChange={setBillOpen}>
                <DialogContent className="rounded-[2rem] max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Bill Details</DialogTitle>
                        <DialogDescription>Grouped view of all lines in this bill.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {selectedBillLines.length === 0 ? (
                            <p className={`text-sm font-bold ${textLabel}`}>No bill lines found.</p>
                        ) : (
                            <>
                                <div className="rounded-2xl border border-gray-200/70 overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Product</TableHead>
                                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Batch</TableHead>
                                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Qty</TableHead>
                                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Unit Price</TableHead>
                                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Line Total</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {selectedBillLines.map((line) => (
                                                <TableRow key={line.id}>
                                                    <TableCell className="px-4">
                                                        <p className={`font-black ${textValue}`}>{line.productName}</p>
                                                        <p className={`text-[10px] font-bold ${textLabel} uppercase`}>
                                                            ID: {line.id} • User: {line.recordedBy}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="font-bold text-sm">
                                                        {line.batchNumber || "-"}
                                                    </TableCell>
                                                    <TableCell className="font-bold text-sm">{line.quantitySold}</TableCell>
                                                    <TableCell className="font-bold text-sm">{money(line.unitPrice)}</TableCell>
                                                    <TableCell className="font-bold text-sm">{money(line.lineTotal)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-gray-200/70 mt-2">
                                    <div className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>
                                        Bill Total
                                    </div>
                                    <div className={`text-2xl font-black ${textValue}`}>
                                        {money(selectedBillTotal)}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setBillOpen(false)}
                            className={`py-4 rounded-2xl ${textLabel} hover:bg-black/5 font-black text-sm`}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}