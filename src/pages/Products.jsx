import React, { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import "../styles/Products.css";

const API = "/api/products";

/* ── Predefined dropdown options ─────────────────────────── */
const MAIN_CATEGORIES = [
  "Dairy", "Bakery", "Beverages", "Fruits", "Vegetables",
  "Meat & Seafood", "Frozen Foods", "Snacks", "Grains & Cereals",
  "Condiments & Sauces", "Canned Goods", "Personal Care",
  "Household", "Baby Products", "Pet Supplies", "Other",
];

const SUB_CATEGORIES = {
  Dairy: ["Milk", "Cheese", "Yogurt", "Butter", "Cream", "Ice Cream"],
  Bakery: ["Bread", "Cakes", "Pastries", "Buns", "Cookies", "Biscuits"],
  Beverages: ["Juice", "Water", "Soda", "Tea", "Coffee", "Energy Drinks"],
  Fruits: ["Tropical", "Citrus", "Berries", "Dried Fruits", "Fresh Fruits"],
  Vegetables: ["Leafy Greens", "Root Vegetables", "Herbs", "Fresh Vegetables"],
  "Meat & Seafood": ["Chicken", "Beef", "Fish", "Pork", "Prawns", "Sausages"],
  "Frozen Foods": ["Frozen Vegetables", "Frozen Meals", "Ice Cream", "Frozen Meat"],
  Snacks: ["Chips", "Nuts", "Chocolates", "Sweets", "Biscuits", "Popcorn"],
  "Grains & Cereals": ["Rice", "Flour", "Oats", "Pasta", "Noodles", "Cereal"],
  "Condiments & Sauces": ["Ketchup", "Mayonnaise", "Soy Sauce", "Chili Sauce", "Vinegar", "Spices"],
  "Canned Goods": ["Canned Fish", "Canned Vegetables", "Canned Fruits", "Soups"],
  "Personal Care": ["Soap", "Shampoo", "Toothpaste", "Deodorant", "Skincare"],
  Household: ["Detergent", "Cleaning Supplies", "Paper Products", "Trash Bags"],
  "Baby Products": ["Baby Food", "Diapers", "Baby Wipes", "Formula"],
  "Pet Supplies": ["Pet Food", "Pet Treats", "Pet Care"],
  Other: ["Miscellaneous"],
};

const ITEM_TYPES = [
  "Perishable", "Non-Perishable", "Frozen", "Refrigerated",
  "Dry Goods", "Liquid", "Fresh", "Canned", "Packaged",
];

/* ── Validation helpers ──────────────────────────────────── */
const MIN_NAME_LENGTH = 3;
const MIN_SUPPLIER_LENGTH = 2;
const MIN_CATEGORY_LENGTH = 2;

const validate = (form) => {
  const errors = [];

  // Product Name
  if (!form.productName.trim()) {
    errors.push("Product name is required.");
  } else if (form.productName.trim().length < MIN_NAME_LENGTH) {
    errors.push(`Product name must be at least ${MIN_NAME_LENGTH} characters.`);
  }

  // Main Category
  if (!form.mainCategory.trim()) {
    errors.push("Main category is required.");
  } else if (form.mainCategory.trim().length < MIN_CATEGORY_LENGTH) {
    errors.push(`Main category must be at least ${MIN_CATEGORY_LENGTH} characters.`);
  }

  // Sub Category (required)
  if (!form.subCategory.trim()) {
    errors.push("Sub category is required.");
  } else if (form.subCategory.trim().length < MIN_CATEGORY_LENGTH) {
    errors.push(`Sub category must be at least ${MIN_CATEGORY_LENGTH} characters.`);
  }

  // Item Type (required)
  if (!form.itemType.trim()) {
    errors.push("Item type is required.");
  } else if (form.itemType.trim().length < MIN_CATEGORY_LENGTH) {
    errors.push(`Item type must be at least ${MIN_CATEGORY_LENGTH} characters.`);
  }

  // Supplier
  if (!form.supplier.trim()) {
    errors.push("Supplier is required.");
  } else if (form.supplier.trim().length < MIN_SUPPLIER_LENGTH) {
    errors.push(`Supplier must be at least ${MIN_SUPPLIER_LENGTH} characters.`);
  }

  // Cost Price
  const cost = Number(form.costPrice);
  if (form.costPrice === "" || isNaN(cost)) {
    errors.push("Cost price is required.");
  } else if (cost < 0) {
    errors.push("Cost price cannot be negative.");
  }

  // Selling Price
  const sell = Number(form.sellingPrice);
  if (form.sellingPrice === "" || isNaN(sell)) {
    errors.push("Selling price is required.");
  } else if (sell <= 0) {
    errors.push("Selling price must be greater than 0.");
  } else if (cost > sell) {
    errors.push("Cost price cannot exceed selling price.");
  }

  // Reorder Level
  const reorder = Number(form.reorderLevel);
  if (form.reorderLevel === "" || isNaN(reorder)) {
    errors.push("Reorder level is required.");
  } else if (reorder < 0) {
    errors.push("Reorder level cannot be negative.");
  } else if (!Number.isInteger(reorder)) {
    errors.push("Reorder level must be a whole number.");
  }

  return errors;
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    productName: "",
    mainCategory: "",
    subCategory: "",
    itemType: "",
    supplier: "",
    costPrice: "",
    sellingPrice: "",
    imageUrl: "",
    reorderLevel: "",
  });

  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  /* Dynamic sub-category options based on selected main category */
  const subCategoryOptions = useMemo(() => {
    const key = form.mainCategory.trim();
    return SUB_CATEGORIES[key] || [];
  }, [form.mainCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await authFetch(API);
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      setProducts((Array.isArray(data) ? data : []).map(p => ({
        ...p,
        productId: p.productId ?? p.id,
        productName: p.productName ?? p.name,
        mainCategory: p.mainCategory ?? p.category,
        sellingPrice: p.sellingPrice ?? p.price ?? 0,
      })));
    } catch (err) {
      setErrors(["Failed to load products"]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = useMemo(() => {
    return products.filter(p =>
      (p.productName || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const resetForm = () => {
    setForm({
      productName: "",
      mainCategory: "",
      subCategory: "",
      itemType: "",
      supplier: "",
      costPrice: "",
      sellingPrice: "",
      imageUrl: "",
      reorderLevel: "",
    });
    setIsEditing(false);
    setEditingId(null);
    setShowForm(false);
    setErrors([]);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      // Reset sub-category when main category changes
      if (name === "mainCategory" && value !== prev.mainCategory) {
        next.subCategory = "";
      }
      return next;
    });
    // Clear errors on input change
    if (errors.length > 0) setErrors([]);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate(form);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      productName: form.productName.trim(),
      mainCategory: form.mainCategory.trim(),
      subCategory: form.subCategory.trim(),
      itemType: form.itemType.trim(),
      supplier: form.supplier.trim(),
      costPrice: Number(form.costPrice),
      sellingPrice: Number(form.sellingPrice),
      imageUrl: form.imageUrl.trim(),
      reorderLevel: Number(form.reorderLevel),
    };

    try {
      const url = isEditing ? `${API}/${editingId}` : API;
      const method = isEditing ? "PUT" : "POST";
      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = "Save failed. Please try again.";
        try {
          const data = await res.json();
          msg = data.message || msg;
        } catch {}
        throw new Error(msg);
      }

      resetForm();
      loadProducts();
    } catch (err) {
      setErrors([err.message || "Save failed. Please try again."]);
    }
  };

  const onEdit = (p) => {
    setForm({
      productName: p.productName || "",
      mainCategory: p.mainCategory || "",
      subCategory: p.subCategory || "",
      itemType: p.itemType || "",
      supplier: p.supplier || "",
      costPrice: p.costPrice ?? "",
      sellingPrice: p.sellingPrice ?? "",
      imageUrl: p.imageUrl || "",
      reorderLevel: p.reorderLevel ?? "",
    });
    setEditingId(p.productId);
    setIsEditing(true);
    setShowForm(true);
    setErrors([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete product?")) return;
    try {
      await authFetch(`${API}/${id}`, { method: "DELETE" });
      loadProducts();
    } catch (err) {
      setErrors(["Delete failed"]);
    }
  };

  return (
    <div className="products-page">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="products-header">
        <h1>Products</h1>
        <p>Manage your product catalog — add, edit, and remove items</p>
      </div>

      {/* ── Error Banner ───────────────────────────────── */}
      {errors.length > 0 && (
        <div className="products-banner">
          {errors.length === 1 ? errors[0] : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {errors.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="products-toolbar">
        <input
          className="products-search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="products-btn-add" onClick={() => { setShowForm(true); setIsEditing(false); setErrors([]); }}>
          + Add Product
        </button>
      </div>

      {/* ── Datalists for comboboxes ────────────────────── */}
      <datalist id="main-categories">
        {MAIN_CATEGORIES.map(c => <option key={c} value={c} />)}
      </datalist>
      <datalist id="sub-categories">
        {subCategoryOptions.map(c => <option key={c} value={c} />)}
      </datalist>
      <datalist id="item-types">
        {ITEM_TYPES.map(t => <option key={t} value={t} />)}
      </datalist>

      {/* ── Add / Edit Form ────────────────────────────── */}
      {showForm && (
        <div className="products-section-card">
          <div className="products-section-title">
            <h2>{isEditing ? "Edit Product" : "New Product"}</h2>
            <span className="products-muted">
              {isEditing ? "Update the details below" : "Fill in the details — select from dropdowns or type your own"}
            </span>
          </div>

          <form onSubmit={onSubmit} className="products-form">
            <div className="products-field">
              <label>Product Name *</label>
              <input
                name="productName"
                placeholder="e.g. Fresh Milk 1L"
                value={form.productName}
                onChange={onChange}
                minLength={MIN_NAME_LENGTH}
                maxLength={100}
              />
              <span className="products-field-hint">Min {MIN_NAME_LENGTH} characters</span>
            </div>

            <div className="products-field">
              <label>Main Category *</label>
              <input
                name="mainCategory"
                list="main-categories"
                placeholder="Select or type…"
                value={form.mainCategory}
                onChange={onChange}
                autoComplete="off"
              />
            </div>

            <div className="products-field">
              <label>Sub Category</label>
              <input
                name="subCategory"
                list="sub-categories"
                placeholder={subCategoryOptions.length ? "Select or type…" : "Type sub category…"}
                value={form.subCategory}
                onChange={onChange}
                autoComplete="off"
              />
            </div>

            <div className="products-field">
              <label>Item Type</label>
              <input
                name="itemType"
                list="item-types"
                placeholder="Select or type…"
                value={form.itemType}
                onChange={onChange}
                autoComplete="off"
              />
            </div>

            <div className="products-field">
              <label>Supplier *</label>
              <input
                name="supplier"
                placeholder="e.g. Highland Dairy"
                value={form.supplier}
                onChange={onChange}
                minLength={MIN_SUPPLIER_LENGTH}
                maxLength={100}
              />
              <span className="products-field-hint">Min {MIN_SUPPLIER_LENGTH} characters</span>
            </div>

            <div className="products-field">
              <label>Cost Price (Rs) *</label>
              <input
                name="costPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.costPrice}
                onChange={onChange}
              />
            </div>

            <div className="products-field">
              <label>Selling Price (Rs) *</label>
              <input
                name="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.sellingPrice}
                onChange={onChange}
              />
            </div>

            <div className="products-field">
              <label>Image URL</label>
              <input
                name="imageUrl"
                placeholder="https://..."
                value={form.imageUrl}
                onChange={onChange}
              />
            </div>

            <div className="products-field">
              <label>Reorder Level *</label>
              <input
                name="reorderLevel"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 10"
                value={form.reorderLevel}
                onChange={onChange}
              />
              <span className="products-field-hint">Whole numbers only, min 0</span>
            </div>

            <div className="products-form-actions">
              <button type="submit" className="products-btn-save">
                {isEditing ? "Update Product" : "Save Product"}
              </button>
              <button type="button" className="products-btn-cancel" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Product Grid ───────────────────────────────── */}
      {loading ? (
        <div className="products-skeleton">Loading products…</div>
      ) : filtered.length === 0 ? (
        <div className="products-empty">
          {products.length === 0
            ? "No products yet. Click \"+ Add Product\" to get started."
            : "No products match your search."}
        </div>
      ) : (
        <div className="products-grid">
          {filtered.map(p => (
            <div className="product-card" key={p.productId}>
              <img
                className="product-card-img"
                src={p.imageUrl || "https://via.placeholder.com/300x200?text=No+Image"}
                alt={p.productName || "Product"}
                onError={(e) => { e.target.src = "https://via.placeholder.com/300x200?text=No+Image"; }}
              />
              <div className="product-card-body">
                <div className="product-card-name">{p.productName}</div>
                <div className="product-card-category">
                  {p.mainCategory}{p.subCategory ? ` • ${p.subCategory}` : ""}
                </div>
                <div className="product-card-price">Rs {p.sellingPrice}</div>
                <div className="product-card-actions">
                  <button className="product-btn-edit" onClick={() => onEdit(p)}>Edit</button>
                  <button className="product-btn-delete" onClick={() => onDelete(p.productId)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;