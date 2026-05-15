from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.database import get_db
from app.models.user import User
from app.models.order import Order
from app.models.recharge import RechargeRecord
from app.config import LOW_BALANCE_THRESHOLD
from app.utils.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    student_count = db.query(func.count(User.id)).filter(User.role == "student", User.is_active == True).scalar()
    month_orders = db.query(func.count(Order.id)).filter(Order.created_at >= month_start).scalar()
    month_freight = db.query(func.sum(Order.total_cost)).filter(Order.created_at >= month_start).scalar() or 0
    month_sales = db.query(func.sum(Order.balance_amount)).filter(Order.created_at >= month_start).scalar() or 0
    low_balance_count = db.query(func.count(User.id)).filter(
        User.role == "student", User.is_active == True, User.balance < LOW_BALANCE_THRESHOLD
    ).scalar()

    return {
        "student_count": student_count,
        "month_orders": month_orders,
        "month_freight": round(float(month_freight), 2),
        "month_sales": round(float(month_sales), 2),
        "low_balance_count": low_balance_count,
    }


@router.get("/student/{student_id}")
def get_student_stats(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != student_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="无权访问")

    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="学员不存在")

    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    month_orders = db.query(func.count(Order.id)).filter(
        Order.student_id == student_id, Order.created_at >= month_start
    ).scalar()
    month_freight = db.query(func.sum(Order.total_cost)).filter(
        Order.student_id == student_id, Order.created_at >= month_start
    ).scalar() or 0
    month_sales = db.query(func.sum(Order.balance_amount)).filter(
        Order.student_id == student_id, Order.created_at >= month_start
    ).scalar() or 0

    total_recharged = db.query(func.sum(RechargeRecord.amount)).filter(
        RechargeRecord.student_id == student_id,
        RechargeRecord.is_canceled == False
    ).scalar() or 0
    total_freight = db.query(func.sum(Order.total_cost)).filter(
        Order.student_id == student_id
    ).scalar() or 0
    computed_balance = float(total_recharged) - float(total_freight)

    return {
        "balance": round(computed_balance, 2),
        "month_orders": month_orders,
        "month_freight": round(float(month_freight), 2),
        "month_sales": round(float(month_sales), 2),
    }


@router.get("/trends")
def get_trends(
    period: str = Query("30d"),
    type: str = Query("orders"),
    student_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    days = 30
    if period.endswith("d"):
        days = int(period[:-1])

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    query = db.query(Order).filter(Order.order_time >= start_date)
    if current_user.role == "student":
        query = query.filter(Order.student_id == current_user.id)
    elif student_id:
        query = query.filter(Order.student_id == student_id)

    orders = query.all()

    daily_data: dict[str, dict] = {}
    for i in range(days):
        d = (end_date - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        daily_data[d] = {"date": d, "count": 0, "freight": 0, "sales": 0}

    for o in orders:
        if o.order_time:
            d = o.order_time.strftime("%Y-%m-%d")
            if d in daily_data:
                daily_data[d]["count"] += 1
                daily_data[d]["freight"] += float(o.total_cost)
                daily_data[d]["sales"] += float(o.balance_amount or 0)

    result = list(daily_data.values())

    if type == "freight":
        return [{"date": r["date"], "value": round(r["freight"], 2)} for r in result]
    elif type == "sales":
        return [{"date": r["date"], "value": round(r["sales"], 2)} for r in result]
    else:
        return [{"date": r["date"], "value": r["count"]} for r in result]


@router.get("/channel-distribution")
def get_channel_distribution(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    results = db.query(Order.channel, func.count(Order.id)).filter(
        Order.channel != "", Order.channel.isnot(None)
    ).group_by(Order.channel).all()

    return [{"name": r[0], "value": r[1]} for r in results]


@router.get("/student-ranking")
def get_student_ranking(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    results = db.query(
        User.name, func.sum(Order.total_cost)
    ).join(Order, Order.student_id == User.id).group_by(User.id).order_by(
        func.sum(Order.total_cost).desc()
    ).limit(10).all()

    return [{"name": r[0], "value": round(float(r[1] or 0), 2)} for r in results]


@router.get("/low-balance")
def get_low_balance(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    students = db.query(User).filter(
        User.role == "student", User.is_active == True, User.balance < LOW_BALANCE_THRESHOLD
    ).order_by(User.balance.asc()).all()

    return [{"id": s.id, "name": s.name, "balance": float(s.balance)} for s in students]