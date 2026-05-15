from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
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
from app.utils.pinyin import generate_username
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
        result.append(StudentResponse(
            id=s.id, name=s.name, username=s.username, role=s.role,
            phone=s.phone, remark=s.remark, balance=float(s.balance),
            is_active=s.is_active, created_at=s.created_at, order_count=order_count or 0,
        ))

    return {"total": total, "page": page, "page_size": page_size, "items": result}


@router.post("", response_model=StudentResponse)
def create_student(
    req: StudentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing_usernames = {u.username for u in db.query(User.username).all()}
    username = generate_username(req.name, existing_usernames)

    student = User(
        name=req.name,
        username=username,
        password_hash=hash_password(username),
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
    return StudentResponse(
        id=student.id, name=student.name, username=student.username, role=student.role,
        phone=student.phone, remark=student.remark, balance=float(student.balance),
        is_active=student.is_active, created_at=student.created_at, order_count=order_count or 0,
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
    db.commit()
    db.refresh(student)
    order_count = db.query(func.count(Order.id)).filter(Order.student_id == student.id).scalar()
    return StudentResponse(
        id=student.id, name=student.name, username=student.username, role=student.role,
        phone=student.phone, remark=student.remark, balance=float(student.balance),
        is_active=student.is_active, created_at=student.created_at, order_count=order_count or 0,
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