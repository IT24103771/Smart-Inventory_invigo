import React, { useEffect, useMemo, useState } from "react";
import "../styles/Products.css";
import axios from "axios";

const API = "/api/products";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    category: "",
    brand: "",
    price: "",
    reorderLevel: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(API);
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load products from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;

    return products.filter((p) =>
      `${p.name} ${p.category} ${p.brand}`.toLowerCase().includes(q)
    );
  }, [products, search]);

  const resetForm = () => {
    setForm({
      name: "",
      category: "",
      brand: "",
      price: "",
      reorderLevel: "",
    });
    setError("");
    setIsEditing(false);
    setEditingId(null);
  };

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!form.name.trim() || !form.category.trim() || !form.brand.trim()) {
      return "Please fill Name, Category, and Brand.";
    }

    const price = Number(form.price);
    const reorderLevel = Number(form.reorderLevel);

    if (Number.isNaN(price) || price <= 0) {
      return "Price must be a valid number greater than 0.";
    }

    if (Number.isNaN(reorderLevel) || reorderLevel < 0) {
      return "Reorder Level must be 0 or more.";
    }

    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      brand: form.brand.trim(),
      price: Number(form.price),
      reorderLevel: Number(form.reorderLevel),
    };

    try {
      if (isEditing) {
        await axios.put(`${API}/${editingId}`, payload);
      } else {
        await axios.post(API, payload);
      }

      resetForm();
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save product.");
    }
  };

  const onEdit = (p) => {
    setIsEditing(true);
    setEditingId(p.id);
    setError("");
    setForm({
      name: p.name || "",
      category: p.category || "",
      brand: p.brand || "",
      price: String(p.price ?? ""),
      reorderLevel: String(p.reorderLevel ?? ""),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this product?");
    if (!ok) return;

    try {
      setError("");
      await axios.delete(`${API}/${id}`);
      if (isEditing && editingId === id) resetForm();
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete product.");
    }
  };

  return (
    <div className="products-page">
      <div className="products-header">
        <div>
          <h1>Products</h1>
          <p className="subtitle">Add, edit, and manage product details</p>
        </div>

        <input
          className="search"
          type="text"
          placeholder="Search by name, category, brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="products-grid">
        <div className="card">
          <div className="card-title">
            <h2>{isEditing ? "Edit Product" : "Add Product"}</h2>
            {isEditing && (
              <button className="btn btn-ghost" onClick={resetForm} type="button">
                Cancel
              </button>
            )}
          </div>

          {error && <div className="error">{error}</div>}

          <form onSubmit={onSubmit} className="form">
            <label>
              Product Name
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="e.g., Milk"
              />
            </label>

            <label>
              Category
              <input
                name="category"
                value={form.category}
                onChange={onChange}
                placeholder="e.g., Dairy"
              />
            </label>

            <label>
              Brand
              <input
                name="brand"
                value={form.brand}
                onChange={onChange}
                placeholder="e.g., Anchor"
              />
            </label>

            <div className="row2">
              <label>
                Price (LKR)
                <input
                  name="price"
                  type="number"
                  value={form.price}
                  onChange={onChange}
                  placeholder="e.g., 250"
                />
              </label>

              <label>
                Reorder Level
                <input
                  name="reorderLevel"
                  type="number"
                  value={form.reorderLevel}
                  onChange={onChange}
                  placeholder="e.g., 10"
                />
              </label>
            </div>

            <button className="btn btn-primary" type="submit">
              {isEditing ? "Update Product" : "Add Product"}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">
            <h2>Product List</h2>
            <span className="count">
              {loading ? "Loading..." : `${filtered.length} items`}
            </span>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th className="right">Price</th>
                  <th className="right">Reorder</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty">
                      {loading ? "Loading..." : "No products found."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.category}</td>
                      <td>{p.brand}</td>
                      <td className="right">LKR {p.price}</td>
                      <td className="right">{p.reorderLevel}</td>
                      <td className="right">
                        <button className="btn btn-small" onClick={() => onEdit(p)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => onDelete(p.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;