from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ErpPreviewItem(BaseModel):
    erp_order_id: int
    order_time: Optional[datetime] = None
    source: str = ""
    student_name: str = ""
    student_match: str = "new"
    currency: str = ""
    balance_amount: Optional[float] = None
    asin: str = ""
    status: str = ""
    image_url: str = ""
    quantity: int = 0
    freight: float = 0
    service_fee: float = 0
    packing_fee: float = 0
    total_cost: float = 0
    region: str = ""


class DuplicateInfo(BaseModel):
    erp_order_id: int
    existing: dict
    incoming: dict
    diff_fields: list[str]


class NewStudentInfo(BaseModel):
    name: str
    username: str
    is_duplicate_name: bool = False
    existing_student_id: Optional[int] = None


class ErpPreviewResponse(BaseModel):
    summary: dict
    new_students: list[NewStudentInfo]
    duplicates: list[dict]
    preview: list[dict]


class ErpConfirmRequest(BaseModel):
    duplicate_decisions: dict[str, str] = {}
    confirmed_students: list[str] = []
    rows_to_import: list[dict] = []


class LogisticsConfirmItem(BaseModel):
    order_id: int
    weight: Optional[float] = None
    logistics_fee: Optional[float] = None
    service_fee: Optional[float] = None
    packing_fee: Optional[float] = None


class LogisticsPreviewResponse(BaseModel):
    summary: dict
    matched: list[dict]
    unmatched: list[dict]


class BatchResponse(BaseModel):
    id: int
    file_type: str
    file_name: str
    total_rows: int
    success_rows: int
    skip_rows: int
    new_students: int
    created_at: datetime

    class Config:
        from_attributes = True