from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import engine
from models import Base
import bcrypt
import jwt
import datetime
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey123")
security = HTTPBearer()

# ── Auth helpers ──────────────────────────────────────────────

def make_token(user_id: int, username: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def decode_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_admin(payload=Depends(decode_token)):
    if payload["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload

# ── Schemas ───────────────────────────────────────────────────

class AuthRequest(BaseModel):
    username: str
    password: str

class ExpenseCreate(BaseModel):
    category: str
    name: str
    amount: float
    expense_date: str

# ── Auth endpoints ────────────────────────────────────────────

@app.post("/register")
def register(req: AuthRequest):
    with engine.begin() as conn:
        existing = conn.execute(
            text("SELECT id FROM users WHERE username = :u"),
            {"u": req.username}
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")

        password_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
        result = conn.execute(
            text("INSERT INTO users (username, password_hash, role) VALUES (:u, :p, 'user') RETURNING id, username, role"),
            {"u": req.username, "p": password_hash}
        )
        user = result.fetchone()

    token = make_token(user.id, user.username, user.role)
    return {"token": token, "username": user.username, "role": user.role}


@app.post("/login")
def login(req: AuthRequest):
    with engine.connect() as conn:
        user = conn.execute(
            text("SELECT id, username, password_hash, role FROM users WHERE username = :u"),
            {"u": req.username}
        ).fetchone()

    if not user or not bcrypt.checkpw(req.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = make_token(user.id, user.username, user.role)
    return {"token": token, "username": user.username, "role": user.role}


# ── Expense endpoints ─────────────────────────────────────────

@app.get("/expenses")
def get_expenses(payload=Depends(decode_token)):
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT * FROM expenses WHERE user_id = :uid ORDER BY expense_date DESC"),
            {"uid": payload["user_id"]}
        ).fetchall()

    return [
        {"id": r.id, "category": r.category, "name": r.name,
         "amount": float(r.amount), "expense_date": str(r.expense_date)}
        for r in rows
    ]


@app.post("/expenses")
def create_expense(expense: ExpenseCreate, payload=Depends(decode_token)):
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO expenses (user_id, category, name, amount, expense_date)
                VALUES (:uid, :category, :name, :amount, :expense_date)
            """),
            {
                "uid": payload["user_id"],
                "category": expense.category,
                "name": expense.name,
                "amount": expense.amount,
                "expense_date": expense.expense_date,
            }
        )
    return {"message": "Expense added"}


@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, payload=Depends(decode_token)):
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM expenses WHERE id = :id AND user_id = :uid"),
            {"id": expense_id, "uid": payload["user_id"]}
        )
    return {"message": "Expense deleted"}


# ── Admin endpoints ───────────────────────────────────────────

@app.get("/admin/users")
def admin_get_users(payload=Depends(require_admin)):
    with engine.connect() as conn:
        users = conn.execute(
            text("SELECT id, username, role FROM users ORDER BY id")
        ).fetchall()
    return [{"id": u.id, "username": u.username, "role": u.role} for u in users]


@app.get("/admin/expenses")
def admin_get_all_expenses(payload=Depends(require_admin)):
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT e.id, e.category, e.name, e.amount, e.expense_date, u.username
                FROM expenses e
                JOIN users u ON e.user_id = u.id
                ORDER BY e.expense_date DESC
            """)
        ).fetchall()
    return [
        {"id": r.id, "category": r.category, "name": r.name,
         "amount": float(r.amount), "expense_date": str(r.expense_date),
         "username": r.username}
        for r in rows
    ]


@app.delete("/admin/users/{user_id}")
def admin_delete_user(user_id: int, payload=Depends(require_admin)):
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM expenses WHERE user_id = :uid"), {"uid": user_id})
        conn.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": user_id})
    return {"message": "User deleted"}


@app.get("/")
def home():
    return {"message": "Expense Tracker API Running"}
