import { useState, useEffect } from "react";
import "./App.css";

const CATEGORY_META = {
  Food:            { icon: "🍔", badge: "badge-food" },
  Travel:          { icon: "✈️", badge: "badge-travel" },
  Entertainment:   { icon: "🎬", badge: "badge-entertainment" },
  Shopping:        { icon: "🛍️", badge: "badge-shopping" },
};

function getCategoryMeta(category) {
  return CATEGORY_META[category] ?? { icon: "📌", badge: "badge-other" };
}

function App() {
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [expenses, setExpenses] = useState([]);

  const fetchExpenses = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/expenses");
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { fetchExpenses(); }, []);

  const addExpense = async () => {
    const finalCategory = category === "Other" ? customCategory : category;
    const expenseData = {
      category: finalCategory,
      name: expenseName,
      amount: Number(amount),
      expense_date: date || new Date().toISOString().split("T")[0],
    };

    try {
      await fetch("http://127.0.0.1:8000/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData),
      });

      setExpenseName("");
      setAmount("");
      setCategory("");
      setCustomCategory("");
      setDate("");
      fetchExpenses();
    } catch (error) {
      console.error(error);
    }
  };

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const filteredExpenses = expenses.filter((e) =>
    e.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container">
      <h1>Expense Tracker</h1>
      <p className="subtitle">Track and manage your spending</p>

      {/* Total banner */}
      <div className="total-banner">
        <div>
          <div className="label">Total Spending</div>
          <div className="amount">₹{total.toLocaleString("en-IN")}</div>
        </div>
        <div style={{ fontSize: 40 }}>💰</div>
      </div>

      {/* Add expense form */}
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
              <input
                placeholder="e.g. Healthcare"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </div>
          )}

          <div className="field full-width">
            <label>Expense Name</label>
            <input
              placeholder="e.g. Lunch at Zomato"
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Amount (₹)</label>
            <input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <button className="btn-primary" onClick={addExpense}>
          + Add Expense
        </button>
      </div>

      {/* Expense list */}
      <div className="card">
        <div className="card-title">Expenses ({filteredExpenses.length})</div>

        <div className="search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="empty-state">
            <span>🔍</span>
            {search ? "No matching expenses found." : "No expenses yet. Add one above!"}
          </div>
        ) : (
          <ul className="expense-list">
            {filteredExpenses.map((expense, index) => {
              const { icon, badge } = getCategoryMeta(expense.category);
              return (
                <li key={index} className="expense-item">
                  <div className="expense-icon">{icon}</div>
                  <div className="expense-info">
                    <div className="expense-name">{expense.name}</div>
                    <div className="expense-meta">{expense.expense_date}</div>
                  </div>
                  <div className="expense-right">
                    <div className="expense-amount">₹{Number(expense.amount).toLocaleString("en-IN")}</div>
                    <span className={`badge ${badge}`}>{expense.category}</span>
                    <button
                      className="btn-delete"
                      onClick={async () => {
                        try {
                          await fetch(`http://127.0.0.1:8000/expenses/${expense.id}`, { method: "DELETE" });
                          fetchExpenses();
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                    >
                      Delete
                    </button>
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
