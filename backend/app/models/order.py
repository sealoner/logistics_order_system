from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, BigInteger, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    erp_order_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    order_time: Mapped[Optional[datetime]] = mapped_column(DateTime)
    source: Mapped[Optional[str]] = mapped_column(String(100))
    currency: Mapped[Optional[str]] = mapped_column(String(10))
    balance_amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    asin: Mapped[Optional[str]] = mapped_column(String(20))
    status: Mapped[Optional[str]] = mapped_column(String(50))
    image_url: Mapped[Optional[str]] = mapped_column(Text)
    gross_weight: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    channel: Mapped[Optional[str]] = mapped_column(String(100))
    tracking_no: Mapped[Optional[str]] = mapped_column(String(100))
    freight: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    service_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    packing_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    total_cost: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    region: Mapped[Optional[str]] = mapped_column(String(20))
    import_batch_id: Mapped[Optional[int]] = mapped_column(ForeignKey("import_batches.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, onupdate=datetime.utcnow)

    student = relationship("User", back_populates="orders")
    batch = relationship("ImportBatch", back_populates="orders")