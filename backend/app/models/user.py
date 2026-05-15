from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(10), nullable=False, default="student")
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    remark: Mapped[Optional[str]] = mapped_column(Text)
    balance: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, onupdate=datetime.utcnow)

    orders = relationship("Order", back_populates="student")
    recharges = relationship("RechargeRecord", back_populates="student")
    deductions = relationship("CostDeduction", back_populates="student")