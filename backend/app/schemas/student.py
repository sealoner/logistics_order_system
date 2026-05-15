from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class StudentCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    remark: Optional[str] = None
    password: Optional[str] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    remark: Optional[str] = None
    password: Optional[str] = None


class StudentResponse(BaseModel):
    id: int
    name: str
    username: str
    role: str
    phone: Optional[str] = None
    remark: Optional[str] = None
    balance: float
    is_active: bool
    created_at: datetime
    order_count: int = 0
    total_freight: float = 0.0
    total_recharged: float = 0.0
    freight_balance: float = 0.0

    class Config:
        from_attributes = True


class RechargeCreate(BaseModel):
    amount: float
    remark: Optional[str] = None


class RechargeResponse(BaseModel):
    id: int
    student_id: int
    amount: float
    balance_before: float
    balance_after: float
    remark: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DeductionResponse(BaseModel):
    id: int
    student_id: int
    order_id: int
    amount: float
    balance_before: float
    balance_after: float
    created_at: datetime

    class Config:
        from_attributes = True


class StudentListParams(BaseModel):
    page: int = 1
    page_size: int = 20
    search: Optional[str] = None