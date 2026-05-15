from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OrderResponse(BaseModel):
    id: int
    erp_order_id: int
    student_id: int
    student_name: str = ""
    order_time: Optional[datetime] = None
    source: Optional[str] = None
    currency: Optional[str] = None
    balance_amount: Optional[float] = None
    asin: Optional[str] = None
    status: Optional[str] = None
    image_url: Optional[str] = None
    gross_weight: float = 0
    quantity: int = 0
    channel: Optional[str] = None
    tracking_no: Optional[str] = None
    freight: float = 0
    service_fee: float = 0
    packing_fee: float = 0
    total_cost: float = 0
    region: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderUpdate(BaseModel):
    freight: Optional[float] = None
    service_fee: Optional[float] = None
    packing_fee: Optional[float] = None
    gross_weight: Optional[float] = None
    status: Optional[str] = None
    channel: Optional[str] = None
    tracking_no: Optional[str] = None