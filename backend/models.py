from sqlalchemy import Column, Integer, String, Numeric, Date
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String)
    name = Column(String)
    amount = Column(Numeric)
    expense_date = Column(Date)