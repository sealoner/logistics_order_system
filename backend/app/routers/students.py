import random
import string

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.order import Order
from app.models.recharge import RechargeRecord
from app.models.deduction import CostDeduction
from app.schemas.student import (
    StudentCreate, StudentUpdate, StudentResponse, RechargeCreate,
    RechargeResponse, DeductionResponse,
)
from app.utils.auth import get_current_user, require_admin, hash_password
from app.utils.pinyin import generate_username, name_to_pinyin
from app.config import LOW_BALANCE_THRESHOLD

router = APIRouter(prefix="/api/students", tags=["students"])


@router.get("")
def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(User).filter(User.role == "student")
    if search:
        query = query.filter(
            (User.name.contains(search)) | (User.username.contains(search)) | (User.phone.contains(search))
        )

    total = query.count()
    students = query.order_by(User.balance.asc()).offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for s in students:
        order_count = db.query(func.count(Order.id)).filter(Order.student_id == s.id).scalar()
        total_freight = db.query(func.sum(Order.total_cost)).filter(Order.student_id == s.id).scalar() or 0
        total_recharged = db.query(func.sum(RechargeRecord.amount)).filter(
            RechargeRecord.student_id == s.id,
            RechargeRecord.is_canceled == False
        ).scalar() or 0
        freight_balance = float(total_recharged) - float(total_freight)
        result.append(StudentResponse(
            id=s.id, name=s.name, username=s.username, role=s.role,
            phone=s.phone, remark=s.remark, balance=float(s.balance),
            is_active=s.is_active, created_at=s.created_at, order_count=order_count or 0,
            total_freight=float(total_freight),
            total_recharged=float(total_recharged),
            freight_balance=freight_balance,
        ))

    return {"total": total, "page": page, "page_size": page_size, "items": result}


@router.get("/generate-credentials")
def generate_credentials(
    name: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    pinyin_str = name_to_pinyin(name)
    random_suffix = ''.join(random.choices(string.digits, k=4))
    password = pinyin_str + random_suffix
    existing_usernames = {u.username for u in db.query(User.username).all()}
    username = generate_username(name, existing_usernames)
    return {"username": username, "password": password}


@router.post("", response_model=StudentResponse)
def create_student(
    req: StudentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing_usernames = {u.username for u in db.query(User.username).all()}
    username = generate_username(req.name, existing_usernames)

    if req.password:
        password = req.password
    else:
        pinyin_str = name_to_pinyin(req.name)
        random_suffix = ''.join(random.choices(string.digits, k=4))
        password = pinyin_str + random_suffix

    student = User(
        name=req.name,
        username=username,
        password_hash=hash_password(password),
        role="student",
        phone=req.phone,
        remark=req.remark,
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    return StudentResponse(
        id=student.id, name=student.name, username=student.username, role=student.role,
        phone=student.phone, remark=student.remark, balance=float(student.balance),
        is_active=student.is_active, created_at=student.created_at, order_count=0,
    )


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="学员不存在")
    order_count = db.query(func.count(Order.id)).filter(Order.student_id == student.id).scalar()
    total_freight = db.query(func.sum(Order.total_cost)).filter(Order.student_id == student.id).scalar() or 0
    total_recharged = db.query(func.sum(RechargeRecord.amount)).filter(
        RechargeRecord.student_id == student.id,
        RechargeRecord.is_canceled == False
    ).scalar() or 0
    freight_balance = float(total_recharged) - float(total_freight)
    return StudentResponse(
        id=student.id, name=student.name, username=student.username, role=student.role,
        phone=student.phone, remark=student.remark, balance=float(student.balance),
        is_active=student.is_active, created_at=student.created_at, order_count=order_count or 0,
        total_freight=float(total_freight),
        total_recharged=float(total_recharged),
        freight_balance=freight_balance,
    )


@router.put("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: int,
    req: StudentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="学员不存在")
    if req.name is not None:
        student.name = req.name
    if req.phone is not None:
        student.phone = req.phone
    if req.remark is not None:
        student.remark = req.remark
    if req.password is not None and req.password.strip():
        student.password_hash = hash_password(req.password.strip())
    db.commit()
    db.refresh(student)
    order_count = db.query(func.count(Order.id)).filter(Order.student_id == student.id).scalar()
    total_freight = db.query(func.sum(Order.total_cost)).filter(Order.student_id == student.id).scalar() or 0
    total_recharged = db.query(func.sum(RechargeRecord.amount)).filter(
        RechargeRecord.student_id == student.id,
        RechargeRecord.is_canceled == False
    ).scalar() or 0
    freight_balance = float(total_recharged) - float(total_freight)
    return StudentResponse(
        id=student.id, name=student.name, username=student.username, role=student.role,
        phone=student.phone, remark=student.remark, balance=float(student.balance),
        is_active=student.is_active, created_at=student.created_at, order_count=order_count or 0,
        total_freight=float(total_freight),
        total_recharged=float(total_recharged),
        freight_balance=freight_balance,
    )


@router.patch("/{student_id}/toggle")
def toggle_student(
    student_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="学员不存在")
    student.is_active = not student.is_active
    db.commit()
    return {"message": "操作成功", "is_active": student.is_active}


@router.post("/{student_id}/recharges", response_model=RechargeResponse)
def recharge(
    student_id: int,
    req: RechargeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="学员不存在")

    balance_before = float(student.balance)
    student.balance = balance_before + req.amount
    balance_after = float(student.balance)

    record = RechargeRecord(
        student_id=student.id,
        amount=req.amount,
        balance_before=balance_before,
        balance_after=balance_after,
        remark=req.remark,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{student_id}/recharges")
def get_recharges(
    student_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(RechargeRecord).filter(RechargeRecord.student_id == student_id)
    total = query.count()
    records = query.order_by(RechargeRecord.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": records}


@router.post("/{student_id}/recharges/{recharge_id}/cancel")
def cancel_recharge(
    student_id: int,
    recharge_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    recharge = db.query(RechargeRecord).filter(
        RechargeRecord.id == recharge_id,
        RechargeRecord.student_id == student_id
    ).first()
    
    if not recharge:
        raise HTTPException(status_code=404, detail="充值记录不存在")
    
    if recharge.is_canceled:
        raise HTTPException(status_code=400, detail="该充值记录已作废")
    
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="学员不存在")
    
    student.balance = float(student.balance) - float(recharge.amount)
    recharge.is_canceled = True
    recharge.canceled_at = datetime.now()
    
    db.commit()
    
    return {"message": "充值记录已作废，余额已回滚", "new_balance": float(student.balance)}


@router.get("/{student_id}/deductions")
def get_deductions(
    student_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="无权访问")
    query = db.query(CostDeduction).filter(CostDeduction.student_id == student_id)
    total = query.count()
    records = query.order_by(CostDeduction.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": records}