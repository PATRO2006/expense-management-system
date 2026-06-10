import { useState, useEffect } from "react";
import "./App.css";

const API = "https://expense-management-system-1-p1ec.onrender.com";

const CATEGORY_META = {
  Food:          { icon: "🍔", badge: "badge-food" },
  Travel:        { icon: "✈️", badge: "badge-travel" },
  Entertainment: { icon: "🎬", badge: "badge-entertainment" },
  Shopping:      { icon: "🛍️", badge: "badge-shopping" },
};

function getCategoryMeta(category) {
  return CATEGORY_META[category] ?? { icon: "📌", badge: "badge-other" };
}

// ── Auth Page ─────────────────────────────────────────────────
function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username || !password) return setError("Please fill in all fields.");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong");
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("role", data.role);
      onLogin(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ fontSize: 40, textAlign: "center", marginBottom: 8 }}>💰</div>
        <h1 style={{ textAlign: "center", marginBottom: 4 }}>Expense Tracker</h1>
        <p className="subtitle">{mode === "login" ? "Sign in to your account" : "Create a new account"}</p>

        {error && <div className="auth-error">{error}</div>}

        <div className="field">
          <label>Username</label>
          <input
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>

        <button className="btn-primary" onClick={submit} disabled={loading} style={{ marginTop: 20 }}>
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "var(--text)" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <span
            style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 600 }}
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          >
            {mode === "login" ? "Register" : "Sign In"}
          </span>
        </p>
      </div>
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────
function AdminDashboard({ token, onLogout }) {
  const [users, setUsers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [activeTab, setActiveTab] = useState("expenses");

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/admin/users`, { headers }).then(r => r.json()).then(setUsers);
    fetch(`${API}/admin/expenses`, { headers }).then(r => r.json()).then(setExpenses);
  }, []);

  const deleteUser = async (userId) => {
    if (!confirm("Delete this user and all their expenses?")) return;
    await fetch(`${API}/admin/users/${userId}`, { method: "DELETE", headers });
    setUsers(users.filter(u => u.id !== userId));
    setExpenses(expenses.filter(e => e.user_id !== userId));
  };

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="container">
      <div className="header">
        <h1>Admin Panel</h1>
        <div className="header-right">
          <button className="btn-delete" onClick={onLogout}>Logout</button>
        </div>
      </div>
      <p className="subtitle">Manage all users and expenses</p>

      <div className="total-banner">
        <div>
          <div className="label">Total Spending (All Users)</div>
          <div className="amount">₹{total.toLocaleString("en-IN")}</div>
        </div>
        <div style={{ fontSize: 40 }}>👑</div>
      </div>

      <div className="tab-bar">
        <button className={activeTab === "expenses" ? "tab active" : "tab"} onClick={() => setActiveTab("expenses")}>
          All Expenses ({expenses.length})
        </button>
        <button className={activeTab === "users" ? "tab active" : "tab"} onClick={() => setActiveTab("users")}>
          Users ({users.length})
        </button>
      </div>

      {activeTab === "expenses" && (
        <div className="card">
          {expenses.length === 0 ? (
            <div className="empty-state"><span>📭</span>No expenses yet.</div>
          ) : (
            <ul className="expense-list">
              {expenses.map((expense) => {
                const { icon, badge } = getCategoryMeta(expense.category);
                return (
                  <li key={expense.id} className="expense-item">
                    <div className="expense-icon">{icon}</div>
                    <div className="expense-info">
                      <div className="expense-name">{expense.name}</div>
                      <div className="expense-meta">{expense.expense_date} · @{expense.username}</div>
                    </div>
                    <div className="expense-right">
                      <div className="expense-amount">₹{Number(expense.amount).toLocaleString("en-IN")}</div>
                      <span className={`badge ${badge}`}>{expense.category}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {activeTab === "users" && (
        <div className="card">
          {users.length === 0 ? (
            <div className="empty-state"><span>👤</span>No users yet.</div>
          ) : (
            <ul className="expense-list">
              {users.map((user) => (
                <li key={user.id} className="expense-item">
                  <div className="expense-icon">👤</div>
                  <div className="expense-info">
                    <div className="expense-name">{user.username}</div>
                    <div className="expense-meta">
                      {expenses.filter(e => e.username === user.username).length} expenses ·{" "}
                      ₹{expenses.filter(e => e.username === user.username).reduce((s, e) => s + Number(e.amount), 0).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="expense-right">
                    <span className={`badge ${user.role === "admin" ? "badge-travel" : "badge-other"}`}>{user.role}</span>
                    {user.role !== "admin" && (
                      <button className="btn-delete" onClick={() => deleteUser(user.id)}>Delete</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");
    return token ? { token, username, role } : null;
  });

  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [expenses, setExpenses] = useState([]);

  const headers = { Authorization: `Bearer ${auth?.token}` };

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`${API}/expenses`, { headers });
      if (res.status === 401) { logout(); return; }
      setExpenses(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (auth && auth.role !== "admin") fetchExpenses(); }, [auth]);

  const logout = () => {
    localStorage.clear();
    setAuth(null);
    setExpenses([]);
  };

  const addExpense = async () => {
    const finalCategory = category === "Other" ? customCategory : category;
    try {
      await fetch(`${API}/expenses`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          category: finalCategory,
          name: expenseName,
          amount: Number(amount),
          expense_date: date || new Date().toISOString().split("T")[0],
        }),
      });
      setExpenseName(""); setAmount(""); setCategory(""); setCustomCategory(""); setDate("");
      fetchExpenses();
    } catch (e) { console.error(e); }
  };

  if (!auth) return <AuthPage onLogin={setAuth} />;
  if (auth.role === "admin") return <AdminDashboard token={auth.token} onLogout={logout} />;

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const filtered = expenses.filter(e => e.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container">
      <div className="header">
        <h1>Expense Tracker</h1>
        <div className="header-right">
          <span>@{auth.username}</span>
          <button className="btn-delete" onClick={logout}>Logout</button>
        </div>
      </div>
      <p className="subtitle">Track and manage your spending</p>

      <div className="total-banner">
        <div>
          <div className="label">Total Spending</div>
          <div className="amount">₹{total.toLocaleString("en-IN")}</div>
        </div>
        <div style={{ fontSize: 40 }}>💰</div>
      </div>

      <div className="card">
        <div className="card-title">Add Expense</div>
        <div className="form-grid">
          <div className="field full-width">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select Category</option>
              <option value="Food">🍔 Food</option>
              <option value="Travel">✈️ Travel</option>
              <option value="Entertainment">🎬 Entertainment</option>
              <option value="Shopping">🛍️ Shopping</option>
              <option value="Other">📌 Other</option>
            </select>
          </div>

          {category === "Other" && (
            <div className="field full-width">
              <label>Custom Category</label>
              <input placeholder="e.g. Healthcare" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />
            </div>
          )}

          <div className="field full-width">
            <label>Expense Name</label>
            <input placeholder="e.g. Lunch at Zomato" value={expenseName} onChange={(e) => setExpenseName(e.target.value)} />
          </div>

          <div className="field">
            <label>Amount (₹)</label>
            <input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary" onClick={addExpense}>+ Add Expense</button>
      </div>

      <div className="card">
        <div className="card-title">Expenses ({filtered.length})</div>
        <div className="search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <span>🔍</span>
            {search ? "No matching expenses." : "No expenses yet. Add one above!"}
          </div>
        ) : (
          <ul className="expense-list">
            {filtered.map((expense) => {
              const { icon, badge } = getCategoryMeta(expense.category);
              return (
                <li key={expense.id} className="expense-item">
                  <div className="expense-icon">{icon}</div>
                  <div className="expense-info">
                    <div className="expense-name">{expense.name}</div>
                    <div className="expense-meta">{expense.expense_date}</div>
                  </div>
                  <div className="expense-right">
                    <div className="expense-amount">₹{Number(expense.amount).toLocaleString("en-IN")}</div>
                    <span className={`badge ${badge}`}>{expense.category}</span>
                    <button className="btn-delete" onClick={async () => {
                      await fetch(`${API}/expenses/${expense.id}`, { method: "DELETE", headers });
                      fetchExpenses();
                    }}>Delete</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
