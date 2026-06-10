from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import engine
from models import Base, Expense
from sqlalchemy import text

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

class ExpenseCreate(BaseModel):
    category: str
    name: str
    amount: float
    expense_date: str


@app.get("/")
def home():
    return {"message": "Expense Tracker API Running"}


@app.get("/expenses")
def get_expenses():
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM expenses")
        )

        expenses = []

        for row in result:
            expenses.append({
                "id": row.id,
                "category": row.category,
                "name": row.name,
                "amount": float(row.amount),
                "expense_date": str(row.expense_date)
            })

        return expenses


@app.post("/expenses")
def create_expense(expense: ExpenseCreate):

    with engine.begin() as conn:
        conn.execute(
            text("""
            INSERT INTO expenses
            (category, name, amount, expense_date)
            VALUES
            (:category, :name, :amount, :expense_date)
            """),
            {
                "category": expense.category,
                "name": expense.name,
                "amount": expense.amount,
                "expense_date": expense.expense_date
            }
        )

    return {"message": "Expense Added Successfully"}


@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int):
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM expenses WHERE id = :id"),
            {"id": expense_id}
        )
    return {"message": "Expense Deleted Successfully"}