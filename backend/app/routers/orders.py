from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, String
import openpyxl
from io import BytesIO
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.order import Order
from app.schemas.order import OrderResponse, OrderUpdate
from app.utils.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("")
def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    student_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Order)

    if current_user.role == "student":
        query = query.filter(Order.student_id == current_user.id)
    elif student_id:
        query = query.filter(Order.student_id == student_id)

    if start_date:
        query = query.filter(Order.order_time >= datetime.strptime(start_date, "%Y-%m-%d"))
    if end_date:
        query = query.filter(Order.order_time <= datetime.strptime(end_date, "%Y-%m-%d"))
    if channel:
        query = query.filter(Order.channel == channel)
    if status:
        query = query.filter(Order.status.contains(status))
    if search:
        query = query.filter(
            (Order.erp_order_id.cast(String).contains(search)) |
            (Order.asin.contains(search)) |
            (Order.tracking_no.contains(search))
        )

    total = query.count()
    orders = query.order_by(Order.order_time.desc().nullslast()).offset((page - 1) * page_size).limit(page_size).all()

    student_ids = {o.student_id for o in orders}
    students = {u.id: u.name for u in db.query(User).filter(User.id.in_(student_ids)).all()}

    items = []
    for o in orders:
        resp = OrderResponse.model_validate(o)
        resp.student_name = students.get(o.student_id, "")
        items.append(resp)

    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    if current_user.role == "student" and order.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问")
    resp = OrderResponse.model_validate(order)
    resp.student_name = order.student.name if order.student else ""
    return resp


@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    req: OrderUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(order, key, value)

    if req.freight is not None or req.service_fee is not None or req.packing_fee is not None:
        order.total_cost = (order.freight or 0) + (order.service_fee or 0) + (order.packing_fee or 0)

    db.commit()
    db.refresh(order)
    resp = OrderResponse.model_validate(order)
    resp.student_name = order.student.name if order.student else ""
    return resp


@router.get("/export")
def export_orders(
    student_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(Order)
    if student_id:
        query = query.filter(Order.student_id == student_id)
    if start_date:
        query = query.filter(Order.order_time >= datetime.strptime(start_date, "%Y-%m-%d"))
    if end_date:
        query = query.filter(Order.order_time <= datetime.strptime(end_date, "%Y-%m-%d"))

    orders = query.order_by(Order.order_time.desc()).all()
    student_ids = {o.student_id for o in orders}
    students = {u.id: u.name for u in db.query(User).filter(User.id.in_(student_ids)).all()}

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "订单导出"
    headers = ["订单ID", "学员", "时间", "ASIN", "渠道", "追踪号", "毛重", "运费", "服务费", "打包费", "总费用", "结余", "状态"]
    ws.append(headers)

    for o in orders:
        ws.append([
            o.erp_order_id, students.get(o.student_id, ""),
            o.order_time.strftime("%Y-%m-%d %H:%M:%S") if o.order_time else "",
            o.asin, o.channel, o.tracking_no,
            float(o.gross_weight), float(o.freight), float(o.service_fee),
            float(o.packing_fee), float(o.total_cost), float(o.balance_amount or 0), o.status,
        ])

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=orders_export.xlsx"},
    )