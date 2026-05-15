# 物流订单数据管理系统 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个前后端分离的物流订单数据管理系统，支持学员管理、Excel导入、运费扣费、数据可视化

**Architecture:** React 18 + Ant Design 5 前端，Python FastAPI 后端，SQLite 数据库，JWT 认证，openpyxl 解析 Excel

**Tech Stack:** Python 3.11+ / FastAPI / SQLAlchemy / SQLite / React 18 / TypeScript / Ant Design 5 / ECharts / Vite / Axios

---

## Phase 1: Backend Foundation

### Task 1: Backend project scaffolding

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`

- [ ] **Step 1: Create requirements.txt**

```txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.35
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.0.1
python-multipart==0.0.9
openpyxl==3.1.5
pypinyin==0.51.0
```

- [ ] **Step 2: Create backend/app/__init__.py**

```python
```

- [ ] **Step 3: Create backend/app/config.py**

```python
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'logistics.db')}"

SECRET_KEY = os.getenv("SECRET_KEY", "logistics-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

ERP_REQUIRED_FIELDS = [
    "id", "时间", "来源", "币种", "结余", "ASIN", "状态", "图片",
    "毛重", "数量", "渠道", "追踪号", "运费", "服务费", "打包费", "地区"
]

LOGISTICS_REQUIRED_FIELDS = [
    "ID", "渠道名称", "国家", "重量", "业务员", "追踪号",
    "物流费", "服务费", "打包费", "物流总费用", "状态", "物流状态", "时间"
]

LOW_BALANCE_THRESHOLD = 50
```

- [ ] **Step 4: Create backend/app/database.py**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 5: Install dependencies**

Run: `cd backend && pip install -r requirements.txt`
Expected: All packages install successfully.

- [ ] **Step 6: Verify imports**

Run: `cd backend && python -c "from app.config import DATABASE_URL; from app.database import engine; print('OK')"`
Expected: `OK`

---

### Task 2: Database models

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/order.py`
- Create: `backend/app/models/recharge.py`
- Create: `backend/app/models/deduction.py`
- Create: `backend/app/models/batch.py`

- [ ] **Step 1: Create backend/app/models/__init__.py**

```python
from app.models.user import User
from app.models.order import Order
from app.models.recharge import RechargeRecord
from app.models.deduction import CostDeduction
from app.models.batch import ImportBatch
```

- [ ] **Step 2: Create backend/app/models/user.py**

```python
from datetime import datetime
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
    phone: Mapped[str | None] = mapped_column(String(20))
    remark: Mapped[str | None] = mapped_column(Text)
    balance: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, onupdate=datetime.utcnow)

    orders = relationship("Order", back_populates="student")
    recharges = relationship("RechargeRecord", back_populates="student")
    deductions = relationship("CostDeduction", back_populates="student")
```

- [ ] **Step 3: Create backend/app/models/order.py**

```python
from datetime import datetime
from sqlalchemy import String, Integer, BigInteger, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    erp_order_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    order_time: Mapped[datetime | None] = mapped_column(DateTime)
    source: Mapped[str | None] = mapped_column(String(100))
    currency: Mapped[str | None] = mapped_column(String(10))
    balance_amount: Mapped[float | None] = mapped_column(Numeric(10, 2))
    asin: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[str | None] = mapped_column(String(50))
    image_url: Mapped[str | None] = mapped_column(Text)
    gross_weight: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    channel: Mapped[str | None] = mapped_column(String(100))
    tracking_no: Mapped[str | None] = mapped_column(String(100))
    freight: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    service_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    packing_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    total_cost: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    region: Mapped[str | None] = mapped_column(String(20))
    import_batch_id: Mapped[int | None] = mapped_column(ForeignKey("import_batches.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, onupdate=datetime.utcnow)

    student = relationship("User", back_populates="orders")
    batch = relationship("ImportBatch", back_populates="orders")
```

- [ ] **Step 4: Create backend/app/models/recharge.py**

```python
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RechargeRecord(Base):
    __tablename__ = "recharge_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    balance_before: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    balance_after: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    remark: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    student = relationship("User", back_populates="recharges")
```

- [ ] **Step 5: Create backend/app/models/deduction.py**

```python
from datetime import datetime
from sqlalchemy import Numeric, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CostDeduction(Base):
    __tablename__ = "cost_deductions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    balance_before: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    balance_after: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    student = relationship("User", back_populates="deductions")
```

- [ ] **Step 6: Create backend/app/models/batch.py**

```python
from datetime import datetime
from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    file_type: Mapped[str] = mapped_column(String(20), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, nullable=False)
    success_rows: Mapped[int] = mapped_column(Integer, nullable=False)
    skip_rows: Mapped[int] = mapped_column(Integer, nullable=False)
    new_students: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    orders = relationship("Order", back_populates="batch")
```

- [ ] **Step 7: Verify models**

Run: `cd backend && python -c "from app.database import Base, engine; from app.models import *; Base.metadata.create_all(bind=engine); print('Tables created OK')"`
Expected: `Tables created OK`

---

### Task 3: Auth utilities

**Files:**
- Create: `backend/app/utils/__init__.py`
- Create: `backend/app/utils/auth.py`

- [ ] **Step 1: Create backend/app/utils/__init__.py**

```python
```

- [ ] **Step 2: Create backend/app/utils/auth.py**

```python
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from app.database import get_db
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
```

- [ ] **Step 3: Verify auth utils**

Run: `cd backend && python -c "from app.utils.auth import hash_password, verify_password; h = hash_password('test'); print(verify_password('test', h))"`
Expected: `True`

---

### Task 4: Pinyin utility

**Files:**
- Create: `backend/app/utils/pinyin.py`

- [ ] **Step 1: Create backend/app/utils/pinyin.py**

```python
from pypinyin import pinyin, Style


def name_to_pinyin(name: str) -> str:
    py_list = pinyin(name, style=Style.NORMAL)
    return "".join([item[0] for item in py_list]).lower()


def generate_username(name: str, existing_usernames: set[str]) -> str:
    base = name_to_pinyin(name)
    if base not in existing_usernames:
        return base
    i = 2
    while f"{base}{i}" in existing_usernames:
        i += 1
    return f"{base}{i}"
```

- [ ] **Step 2: Verify pinyin**

Run: `cd backend && python -c "from app.utils.pinyin import name_to_pinyin, generate_username; print(name_to_pinyin('管林海')); print(generate_username('管林海', {'guanlinhai'}))"`
Expected: `guanlinhai` then `guanlinhai2`

---

### Task 5: Database initialization

**Files:**
- Create: `backend/init_db.py`

- [ ] **Step 1: Create backend/init_db.py**

```python
from app.database import engine, Base, SessionLocal
from app.models import *
from app.utils.auth import hash_password


def init_db():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == "admin").first()
        if not existing:
            admin = User(
                name="管理员",
                username="admin",
                password_hash=hash_password("admin123"),
                role="admin",
            )
            db.add(admin)
            db.commit()
            print("Admin user created: admin / admin123")
        else:
            print("Admin user already exists")
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
```

- [ ] **Step 2: Run init_db**

Run: `cd backend && python init_db.py`
Expected: `Admin user created: admin / admin123`

---

## Phase 2: Backend API Routes

### Task 6: Auth router

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/auth.py`

- [ ] **Step 1: Create backend/app/schemas/__init__.py**

```python
```

- [ ] **Step 2: Create backend/app/schemas/auth.py**

```python
from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user_id: int
    name: str
    username: str
    role: str


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str


class UserInfo(BaseModel):
    id: int
    name: str
    username: str
    role: str
    phone: str | None = None
    balance: float

    class Config:
        from_attributes = True
```

- [ ] **Step 3: Create backend/app/routers/__init__.py**

```python
```

- [ ] **Step 4: Create backend/app/routers/auth.py**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, PasswordChangeRequest, UserInfo
from app.utils.auth import verify_password, hash_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="账号已被禁用")

    token = create_access_token({"sub": user.id, "role": user.role})
    return LoginResponse(
        token=token,
        user_id=user.id,
        name=user.name,
        username=user.username,
        role=user.role,
    )


@router.get("/me", response_model=UserInfo)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/password")
def change_password(
    req: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(req.old_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="旧密码错误")
    current_user.password_hash = hash_password(req.new_password)
    db.commit()
    return {"message": "密码修改成功"}
```

---

### Task 7: Student management router

**Files:**
- Create: `backend/app/schemas/student.py`
- Create: `backend/app/routers/students.py`

- [ ] **Step 1: Create backend/app/schemas/student.py**

```python
from datetime import datetime
from pydantic import BaseModel


class StudentCreate(BaseModel):
    name: str
    phone: str | None = None
    remark: str | None = None


class StudentUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    remark: str | None = None


class StudentResponse(BaseModel):
    id: int
    name: str
    username: str
    role: str
    phone: str | None = None
    remark: str | None = None
    balance: float
    is_active: bool
    created_at: datetime
    order_count: int = 0

    class Config:
        from_attributes = True


class RechargeCreate(BaseModel):
    amount: float
    remark: str | None = None


class RechargeResponse(BaseModel):
    id: int
    student_id: int
    amount: float
    balance_before: float
    balance_after: float
    remark: str | None = None
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
    search: str | None = None
```

- [ ] **Step 2: Create backend/app/routers/students.py**

```python
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
```

---

### Task 8: Order management router

**Files:**
- Create: `backend/app/schemas/order.py`
- Create: `backend/app/routers/orders.py`

- [ ] **Step 1: Create backend/app/schemas/order.py**

```python
from datetime import datetime
from pydantic import BaseModel


class OrderResponse(BaseModel):
    id: int
    erp_order_id: int
    student_id: int
    student_name: str = ""
    order_time: datetime | None = None
    source: str | None = None
    currency: str | None = None
    balance_amount: float | None = None
    asin: str | None = None
    status: str | None = None
    image_url: str | None = None
    gross_weight: float = 0
    quantity: int = 0
    channel: str | None = None
    tracking_no: str | None = None
    freight: float = 0
    service_fee: float = 0
    packing_fee: float = 0
    total_cost: float = 0
    region: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class OrderUpdate(BaseModel):
    freight: float | None = None
    service_fee: float | None = None
    packing_fee: float | None = None
    gross_weight: float | None = None
    status: str | None = None
    channel: str | None = None
    tracking_no: str | None = None
```

- [ ] **Step 2: Create backend/app/routers/orders.py**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
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
    student_id: int = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None),
    channel: str = Query(None),
    status: str = Query(None),
    search: str = Query(None),
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
    student_id: int = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None),
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
```

---

### Task 9: Excel parser & name extractor services

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/name_extractor.py`
- Create: `backend/app/services/excel_parser.py`
- Create: `backend/app/services/deduction.py`

- [ ] **Step 1: Create backend/app/services/__init__.py**

```python
```

- [ ] **Step 2: Create backend/app/services/name_extractor.py**

```python
import re


def extract_student_name(source: str) -> str:
    if not source:
        return ""

    pattern = r"亚马逊\s+(.+?)\s*\("
    match = re.search(pattern, source)
    if match:
        return match.group(1).strip()

    prefix = "亚马逊 "
    if source.startswith(prefix):
        name_part = source[len(prefix):]
        paren_idx = name_part.find("(")
        if paren_idx > 0:
            return name_part[:paren_idx].strip()
        return name_part.strip()

    return source.strip()
```

- [ ] **Step 3: Create backend/app/services/excel_parser.py**

```python
import openpyxl
from typing import Any
from datetime import datetime


def validate_fields(headers: list[str], required: list[str]) -> list[str]:
    header_set = set(headers)
    missing = [f for f in required if f not in header_set]
    return missing


def parse_erp_row(row_data: dict[str, Any]) -> dict[str, Any]:
    order_time = None
    if row_data.get("时间"):
        try:
            if isinstance(row_data["时间"], datetime):
                order_time = row_data["时间"]
            elif isinstance(row_data["时间"], str):
                order_time = datetime.strptime(row_data["时间"], "%Y/%m/%d %H:%M:%S")
        except (ValueError, TypeError):
            pass

    balance_amount = None
    if row_data.get("结余"):
        raw = str(row_data["结余"]).replace("$", "").replace(",", "").strip()
        try:
            balance_amount = float(raw)
        except (ValueError, TypeError):
            balance_amount = None

    freight = _safe_float(row_data.get("运费"))
    service_fee = _safe_float(row_data.get("服务费"))
    packing_fee = _safe_float(row_data.get("打包费"))
    total_cost = freight + service_fee + packing_fee

    return {
        "erp_order_id": _safe_int(row_data.get("id")),
        "order_time": order_time,
        "source": str(row_data.get("来源") or ""),
        "currency": str(row_data.get("币种") or ""),
        "balance_amount": balance_amount,
        "asin": str(row_data.get("ASIN") or ""),
        "status": str(row_data.get("状态") or ""),
        "image_url": str(row_data.get("图片") or ""),
        "gross_weight": 0,
        "quantity": _safe_int(row_data.get("数量")),
        "channel": str(row_data.get("渠道") or "") if row_data.get("渠道") else "",
        "tracking_no": str(row_data.get("追踪号") or "") if row_data.get("追踪号") else "",
        "freight": freight,
        "service_fee": service_fee,
        "packing_fee": packing_fee,
        "total_cost": total_cost,
        "region": str(row_data.get("地区") or ""),
    }


def parse_logistics_row(row_data: dict[str, Any]) -> dict[str, Any]:
    return {
        "logistics_id": _safe_int(row_data.get("ID")),
        "channel_name": str(row_data.get("渠道名称") or ""),
        "country": str(row_data.get("国家") or ""),
        "weight": _safe_float(row_data.get("重量")),
        "salesman": str(row_data.get("业务员") or ""),
        "tracking_no": str(row_data.get("追踪号") or ""),
        "logistics_fee": _safe_float(row_data.get("物流费")),
        "service_fee": _safe_float(row_data.get("服务费")),
        "packing_fee": _safe_float(row_data.get("打包费")),
        "total_logistics_fee": _safe_float(row_data.get("物流总费用")),
        "status": str(row_data.get("状态") or ""),
        "logistics_status": str(row_data.get("物流状态") or ""),
        "time": _safe_datetime(row_data.get("时间")),
    }


def read_excel_to_dicts(file_content: bytes) -> tuple[list[str], list[dict[str, Any]]]:
    wb = openpyxl.load_workbook(BytesIO(file_content))
    ws = wb.active
    headers = [str(cell.value) if cell.value is not None else "" for cell in ws[1]]

    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        row_dict = {}
        for i, header in enumerate(headers):
            if i < len(row):
                row_dict[header] = row[i]
            else:
                row_dict[header] = None
        rows.append(row_dict)

    return headers, rows


def _safe_float(val: Any) -> float:
    if val is None:
        return 0.0
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def _safe_int(val: Any) -> int:
    if val is None:
        return 0
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0


def _safe_datetime(val: Any) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    try:
        return datetime.strptime(str(val), "%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError):
        return None


from io import BytesIO
```

- [ ] **Step 4: Create backend/app/services/deduction.py**

```python
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.order import Order
from app.models.deduction import CostDeduction


def deduct_order_cost(db: Session, student: User, order: Order):
    total_cost = float(order.total_cost)
    balance_before = float(student.balance)
    balance_after = balance_before - total_cost

    student.balance = balance_after

    deduction = CostDeduction(
        student_id=student.id,
        order_id=order.id,
        amount=total_cost,
        balance_before=balance_before,
        balance_after=balance_after,
    )
    db.add(deduction)
    return deduction
```

---

### Task 10: File upload router

**Files:**
- Create: `backend/app/schemas/upload.py`
- Create: `backend/app/routers/upload.py`

- [ ] **Step 1: Create backend/app/schemas/upload.py**

```python
from datetime import datetime
from pydantic import BaseModel


class ErpPreviewItem(BaseModel):
    erp_order_id: int
    order_time: datetime | None = None
    source: str = ""
    student_name: str = ""
    student_match: str = "new"
    currency: str = ""
    balance_amount: float | None = None
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
    existing_student_id: int | None = None


class ErpPreviewResponse(BaseModel):
    summary: dict
    new_students: list[NewStudentInfo]
    duplicates: list[dict]
    preview: list[dict]


class ErpConfirmRequest(BaseModel):
    duplicate_decisions: dict[str, str] = {}
    confirmed_students: list[str] = []
    rows_to_import: list[dict] = []


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
```

- [ ] **Step 2: Create backend/app/routers/upload.py**

```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.order import Order
from app.models.batch import ImportBatch
from app.schemas.upload import ErpConfirmRequest, BatchResponse
from app.utils.auth import require_admin
from app.services.excel_parser import validate_fields, parse_erp_row, parse_logistics_row, read_excel_to_dicts
from app.services.name_extractor import extract_student_name
from app.services.deduction import deduct_order_cost
from app.utils.pinyin import generate_username
from app.utils.auth import hash_password
from app.config import ERP_REQUIRED_FIELDS, LOGISTICS_REQUIRED_FIELDS

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("/erp")
def upload_erp(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="仅支持 .xlsx 文件")

    content = file.file.read()
    headers, rows = read_excel_to_dicts(content)

    missing = validate_fields(headers, ERP_REQUIRED_FIELDS)
    if missing:
        raise HTTPException(status_code=400, detail=f"缺少字段: {', '.join(missing)}")

    existing_students = {u.name: u for u in db.query(User).filter(User.role == "student").all()}
    existing_order_ids = {o.erp_order_id: o for o in db.query(Order).all()}

    preview = []
    new_students_map: dict[str, dict] = {}
    duplicates = []
    all_usernames = {u.username for u in db.query(User).all()}

    for row in rows:
        parsed = parse_erp_row(row)
        student_name = extract_student_name(parsed["source"])
        parsed["student_name"] = student_name

        if student_name and student_name not in existing_students and student_name not in new_students_map:
            is_dup = student_name in existing_students
            username = generate_username(student_name, all_usernames)
            all_usernames.add(username)
            new_students_map[student_name] = {
                "name": student_name,
                "username": username,
                "is_duplicate_name": False,
                "existing_student_id": None,
            }
        elif student_name in existing_students:
            parsed["student_match"] = "matched"
        elif student_name in new_students_map:
            parsed["student_match"] = "new"

        if parsed["erp_order_id"] in existing_order_ids:
            existing = existing_order_ids[parsed["erp_order_id"]]
            existing_dict = {
                "erp_order_id": existing.erp_order_id,
                "order_time": existing.order_time.isoformat() if existing.order_time else None,
                "freight": float(existing.freight),
                "service_fee": float(existing.service_fee),
                "packing_fee": float(existing.packing_fee),
                "total_cost": float(existing.total_cost),
                "gross_weight": float(existing.gross_weight),
                "status": existing.status,
                "channel": existing.channel,
                "tracking_no": existing.tracking_no,
                "image_url": existing.image_url,
                "balance_amount": float(existing.balance_amount) if existing.balance_amount else None,
            }
            diff_fields = []
            for key in ["freight", "service_fee", "packing_fee", "total_cost", "status", "channel", "tracking_no", "image_url", "balance_amount"]:
                old_val = existing_dict.get(key)
                new_val = parsed.get(key)
                if old_val != new_val:
                    diff_fields.append(key)
            duplicates.append({
                "erp_order_id": parsed["erp_order_id"],
                "existing": existing_dict,
                "incoming": parsed,
                "diff_fields": diff_fields,
            })
        else:
            preview.append(parsed)

    summary = {
        "total_rows": len(rows),
        "new_rows": len(preview),
        "duplicate_rows": len(duplicates),
    }

    return {
        "summary": summary,
        "new_students": list(new_students_map.values()),
        "duplicates": duplicates,
        "preview": preview,
    }


@router.post("/erp/confirm")
def confirm_erp(
    req: ErpConfirmRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing_students = {u.name: u for u in db.query(User).filter(User.role == "student").all()}
    all_usernames = {u.username for u in db.query(User).all()}
    new_students_created = 0

    student_cache: dict[str, User] = dict(existing_students)

    for name in req.confirmed_students:
        if name not in student_cache:
            username = generate_username(name, all_usernames)
            all_usernames.add(username)
            student = User(
                name=name,
                username=username,
                password_hash=hash_password(username),
                role="student",
            )
            db.add(student)
            db.flush()
            student_cache[name] = student
            new_students_created += 1

    batch = ImportBatch(
        file_type="erp",
        file_name="erp_import",
        total_rows=len(req.rows_to_import),
        success_rows=0,
        skip_rows=0,
        new_students=new_students_created,
    )
    db.add(batch)
    db.flush()

    success = 0
    skip = 0

    for row_data in req.rows_to_import:
        erp_id = row_data["erp_order_id"]
        decision = req.duplicate_decisions.get(str(erp_id))

        existing_order = db.query(Order).filter(Order.erp_order_id == erp_id).first()

        if existing_order:
            if decision == "keep_old":
                skip += 1
                continue
            elif decision == "replace":
                _apply_order_data(existing_order, row_data)
                db.flush()
                success += 1
            elif decision == "merge":
                _merge_order_data(existing_order, row_data)
                db.flush()
                success += 1
        else:
            student_name = row_data.get("student_name", "")
            student = student_cache.get(student_name)
            if not student:
                skip += 1
                continue

            order = Order(student_id=student.id, import_batch_id=batch.id)
            _apply_order_data(order, row_data)
            db.add(order)
            db.flush()

            if order.total_cost > 0:
                deduct_order_cost(db, student, order)

            success += 1

    batch.success_rows = success
    batch.skip_rows = skip
    db.commit()

    return {"message": "导入完成", "success_rows": success, "skip_rows": skip, "new_students": new_students_created}


@router.post("/logistics")
def upload_logistics(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="仅支持 .xlsx 文件")

    content = file.file.read()
    headers, rows = read_excel_to_dicts(content)

    missing = validate_fields(headers, LOGISTICS_REQUIRED_FIELDS)
    if missing:
        raise HTTPException(status_code=400, detail=f"缺少字段: {', '.join(missing)}")

    existing_order_ids = {o.erp_order_id: o for o in db.query(Order).all()}

    matched = []
    unmatched = []

    for row in rows:
        parsed = parse_logistics_row(row)
        lid = parsed["logistics_id"]

        if lid in existing_order_ids:
            order = existing_order_ids[lid]
            matched.append({
                "logistics_id": lid,
                "order_id": order.id,
                "erp_order_id": order.erp_order_id,
                "weight": parsed["weight"],
                "current_gross_weight": float(order.gross_weight),
                "channel_name": parsed["channel_name"],
                "tracking_no": parsed["tracking_no"],
            })
        else:
            unmatched.append({
                "logistics_id": lid,
                "reason": "未找到对应订单",
            })

    return {
        "summary": {"total": len(rows), "matched": len(matched), "unmatched": len(unmatched)},
        "matched": matched,
        "unmatched": unmatched,
    }


@router.post("/logistics/confirm")
def confirm_logistics(
    matched_ids: list[int],
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    updated = 0
    batch = ImportBatch(
        file_type="logistics",
        file_name="logistics_import",
        total_rows=len(matched_ids),
        success_rows=0,
        skip_rows=0,
    )
    db.add(batch)
    db.flush()

    for order_id in matched_ids:
        order = db.query(Order).filter(Order.id == order_id).first()
        if order:
            updated += 1

    batch.success_rows = updated
    db.commit()

    return {"message": "导入完成", "updated_rows": updated}


@router.get("/batches")
def list_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(ImportBatch)
    total = query.count()
    batches = query.order_by(ImportBatch.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": batches}


def _apply_order_data(order, data: dict):
    order.erp_order_id = data["erp_order_id"]
    order.order_time = data.get("order_time")
    order.source = data.get("source", "")
    order.currency = data.get("currency", "")
    order.balance_amount = data.get("balance_amount")
    order.asin = data.get("asin", "")
    order.status = data.get("status", "")
    order.image_url = data.get("image_url", "")
    order.gross_weight = data.get("gross_weight", 0)
    order.quantity = data.get("quantity", 0)
    order.channel = data.get("channel", "")
    order.tracking_no = data.get("tracking_no", "")
    order.freight = data.get("freight", 0)
    order.service_fee = data.get("service_fee", 0)
    order.packing_fee = data.get("packing_fee", 0)
    order.total_cost = data.get("total_cost", 0)
    order.region = data.get("region", "")


def _merge_order_data(existing_order, new_data: dict):
    for field in ["order_time", "source", "currency", "balance_amount", "asin", "status",
                  "image_url", "gross_weight", "quantity", "channel", "tracking_no",
                  "freight", "service_fee", "packing_fee", "total_cost", "region"]:
        current_val = getattr(existing_order, field, None)
        new_val = new_data.get(field)
        if current_val is None or current_val == 0 or current_val == "":
            if new_val is not None and new_val != 0 and new_val != "":
                setattr(existing_order, field, new_val)

    existing_order.total_cost = (existing_order.freight or 0) + (existing_order.service_fee or 0) + (existing_order.packing_fee or 0)
```

---

### Task 11: Statistics router

**Files:**
- Create: `backend/app/routers/stats.py`

- [ ] **Step 1: Create backend/app/routers/stats.py**

```python
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.database import get_db
from app.models.user import User
from app.models.order import Order
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

    return {
        "balance": float(student.balance),
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
```

---

### Task 12: FastAPI main app & CORS

**Files:**
- Create: `backend/app/main.py`

- [ ] **Step 1: Create backend/app/main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, students, orders, upload, stats

app = FastAPI(title="物流订单管理系统 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(orders.router)
app.include_router(upload.router)
app.include_router(stats.router)


@app.get("/")
def root():
    return {"message": "物流订单管理系统 API"}
```

- [ ] **Step 2: Start backend and verify**

Run: `cd backend && uvicorn app.main:app --reload --port 8000` (in background)
Run: `curl http://localhost:8000/`
Expected: `{"message":"物流订单管理系统 API"}`

Run: `curl -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'`
Expected: JSON with `token`, `user_id`, `role: "admin"`

---

## Phase 3: Frontend Foundation

### Task 13: Frontend project scaffolding

**Files:**
- Create: `frontend/` via Vite

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

Run: `cd /Users/xiefeng/Documents/CreateWorld/logistics_order_system && npm create vite@latest frontend -- --template react-ts`
Expected: Project created successfully

- [ ] **Step 2: Install dependencies**

Run:
```bash
cd frontend && npm install && npm install antd @ant-design/icons axios react-router-dom echarts echarts-for-react dayjs
```

- [ ] **Step 3: Configure Vite proxy**

Modify `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 4: Clean up default files**

Delete: `frontend/src/App.css`, `frontend/src/index.css`
Remove all content from `frontend/src/App.tsx` (keep just `function App() { return null } export default App`)

---

### Task 14: API client & auth context

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/contexts/AuthContext.tsx`

- [ ] **Step 1: Create frontend/src/api/client.ts**

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
```

- [ ] **Step 2: Create frontend/src/api/auth.ts**

```typescript
import client from './client';

export interface LoginParams {
  username: string;
  password: string;
}

export interface UserInfo {
  id: number;
  name: string;
  username: string;
  role: string;
  phone?: string;
  balance: number;
}

export async function login(params: LoginParams) {
  const { data } = await client.post('/auth/login', params);
  return data;
}

export async function getMe(): Promise<UserInfo> {
  const { data } = await client.get('/auth/me');
  return data;
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const { data } = await client.put('/auth/password', { old_password: oldPassword, new_password: newPassword });
  return data;
}
```

- [ ] **Step 3: Create frontend/src/contexts/AuthContext.tsx**

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserInfo, login as loginApi, getMe } from '../api/auth';

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await loginApi({ username, password });
    localStorage.setItem('token', res.token);
    const userInfo: UserInfo = {
      id: res.user_id,
      name: res.name,
      username: res.username,
      role: res.role,
    };
    localStorage.setItem('user', JSON.stringify(userInfo));
    setUser(userInfo);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

---

### Task 15: Route guards & Layout

**Files:**
- Create: `frontend/src/components/RouteGuard/index.tsx`
- Create: `frontend/src/components/Layout/index.tsx`
- Create: `frontend/src/components/Layout/index.css`

- [ ] **Step 1: Create frontend/src/components/RouteGuard/index.tsx**

```typescript
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Spin } from 'antd';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function StudentRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
  }

  if (!user || user.role !== 'student') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Create frontend/src/components/Layout/index.tsx**

```typescript
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Drawer, theme } from 'antd';
import {
  DashboardOutlined, UserOutlined, ShoppingOutlined,
  UploadOutlined, HistoryOutlined, LogoutOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, WalletOutlined,
  FileTextOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import './index.css';

const { Header, Sider, Content } = AntLayout;

const adminMenuItems = [
  { key: '/admin/dashboard', icon: <DashboardOutlined />, label: '数据看板' },
  { key: '/admin/students', icon: <UserOutlined />, label: '学员管理' },
  { key: '/admin/orders', icon: <ShoppingOutlined />, label: '订单管理' },
  { key: '/admin/upload', icon: <UploadOutlined />, label: '文件上传' },
  { key: '/admin/batches', icon: <HistoryOutlined />, label: '导入历史' },
];

const studentMenuItems = [
  { key: '/student/dashboard', icon: <BarChartOutlined />, label: '我的看板' },
  { key: '/student/orders', icon: <ShoppingOutlined />, label: '我的订单' },
  { key: '/student/billing', icon: <WalletOutlined />, label: '我的账单' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: themeToken } = theme.useToken();

  const isAdmin = user?.role === 'admin';
  const menuItems = isAdmin ? adminMenuItems : studentMenuItems;

  const handleMenuClick = (key: string) => {
    navigate(key);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const selectedKey = menuItems.find(item => location.pathname.startsWith(item.key))?.key || menuItems[0]?.key;

  const menuNode = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', textAlign: 'center', borderBottom: `1px solid ${themeToken.colorBorderSecondary}` }}>
        <h2 style={{ color: themeToken.colorPrimary, margin: 0, fontSize: collapsed ? 14 : 18, whiteSpace: 'nowrap' }}>
          {collapsed ? '物流' : '物流订单管理'}
        </h2>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => handleMenuClick(key)}
        style={{ flex: 1, borderRight: 0 }}
      />
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${themeToken.colorBorderSecondary}` }}>
        <div style={{ marginBottom: 8, fontSize: 12, color: themeToken.colorTextSecondary }}>
          {user?.name} ({isAdmin ? '管理员' : '学员'})
        </div>
        <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} danger size="small" block>
          退出登录
        </Button>
      </div>
    </div>
  );

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <div className="desktop-sider">
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          breakpoint="lg"
          style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100 }}
        >
          {menuNode}
        </Sider>
      </div>

      <AntLayout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header style={{
          padding: '0 16px',
          background: themeToken.colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 99,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="desktop-trigger"
            />
            <Button
              type="text"
              icon={<MenuUnfoldOutlined />}
              onClick={() => setMobileMenuOpen(true)}
              className="mobile-trigger"
            />
            <span style={{ fontWeight: 600 }}>{menuItems.find(i => i.key === selectedKey)?.label}</span>
          </div>
        </Header>

        <Content style={{ margin: 16, minHeight: 280 }}>
          <Outlet />
        </Content>
      </AntLayout>

      <Drawer
        placement="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        width={240}
        bodyStyle={{ padding: 0 }}
      >
        {menuNode}
      </Drawer>
    </AntLayout>
  );
}
```

- [ ] **Step 3: Create frontend/src/components/Layout/index.css**

```css
.desktop-trigger { display: inline-flex; }
.mobile-trigger { display: none; }

@media (max-width: 768px) {
  .desktop-sider { display: none; }
  .desktop-trigger { display: none; }
  .mobile-trigger { display: inline-flex; }
  .ant-layout { margin-left: 0 !important; }
}
```

---

### Task 16: Login page

**Files:**
- Create: `frontend/src/pages/Login/index.tsx`
- Create: `frontend/src/pages/Login/index.css`

- [ ] **Step 1: Create frontend/src/pages/Login/index.tsx**

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import './index.css';

const { Title } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate(user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard', { replace: true });
    return null;
  }

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      const stored = localStorage.getItem('user');
      const u = stored ? JSON.parse(stored) : null;
      navigate(u?.role === 'admin' ? '/admin/dashboard' : '/student/dashboard', { replace: true });
    } catch {
      message.error('用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" bordered={false}>
        <div className="login-header">
          <Title level={3} style={{ margin: 0 }}>物流订单管理系统</Title>
          <p style={{ color: '#8c8c8c', marginTop: 8 }}>Amazon Cross-Border Logistics</p>
        </div>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input prefix={<UserOutlined />} placeholder="账号" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create frontend/src/pages/Login/index.css**

```css
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #0c1c3c 0%, #1a3a6b 50%, #0d2137 100%);
}

.login-card {
  width: 400px;
  max-width: 90vw;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95) !important;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}
```

---

### Task 17: App.tsx with routing

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Create frontend/src/App.tsx**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, AdminRoute, StudentRoute } from './components/RouteGuard';
import AppLayout from './components/Layout';
import LoginPage from './pages/Login';

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
      }}
    >
      <AntApp>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<ProtectedRoute><AdminRoute><AppLayout /></AdminRoute></ProtectedRoute>}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<div>管理后台看板</div>} />
                <Route path="students" element={<div>学员管理</div>} />
                <Route path="students/:id" element={<div>学员详情</div>} />
                <Route path="orders" element={<div>订单管理</div>} />
                <Route path="upload" element={<div>文件上传</div>} />
                <Route path="batches" element={<div>导入历史</div>} />
              </Route>
              <Route path="/student" element={<ProtectedRoute><StudentRoute><AppLayout /></StudentRoute></ProtectedRoute>}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<div>学员看板</div>} />
                <Route path="orders" element={<div>我的订单</div>} />
                <Route path="billing" element={<div>我的账单</div>} />
              </Route>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}
```

- [ ] **Step 2: Modify frontend/src/main.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 3: Verify frontend starts**

Run: `cd frontend && npm run dev`
Expected: Dev server starts on http://localhost:5173, login page renders

---

## Phase 4: Frontend Pages - Admin

> **Note:** For Tasks 18-24, the frontend-design skill will be used to build production-grade UI. The code below provides functional scaffolding with Ant Design components; the frontend-design skill will enhance visual polish.

### Task 18: Admin API modules

**Files:**
- Create: `frontend/src/api/students.ts`
- Create: `frontend/src/api/orders.ts`
- Create: `frontend/src/api/upload.ts`
- Create: `frontend/src/api/stats.ts`

- [ ] **Step 1: Create frontend/src/api/students.ts**

```typescript
import client from './client';

export interface StudentItem {
  id: number;
  name: string;
  username: string;
  role: string;
  phone?: string;
  remark?: string;
  balance: number;
  is_active: boolean;
  created_at: string;
  order_count: number;
}

export async function getStudents(params: { page?: number; page_size?: number; search?: string }) {
  const { data } = await client.get('/students', { params });
  return data;
}

export async function createStudent(body: { name: string; phone?: string; remark?: string }) {
  const { data } = await client.post('/students', body);
  return data;
}

export async function getStudent(id: number) {
  const { data } = await client.get(`/students/${id}`);
  return data;
}

export async function updateStudent(id: number, body: { name?: string; phone?: string; remark?: string }) {
  const { data } = await client.put(`/students/${id}`, body);
  return data;
}

export async function toggleStudent(id: number) {
  const { data } = await client.patch(`/students/${id}/toggle`);
  return data;
}

export async function rechargeStudent(id: number, amount: number, remark?: string) {
  const { data } = await client.post(`/students/${id}/recharges`, { amount, remark });
  return data;
}

export async function getRecharges(id: number, page = 1, pageSize = 20) {
  const { data } = await client.get(`/students/${id}/recharges`, { params: { page, page_size: pageSize } });
  return data;
}

export async function getDeductions(id: number, page = 1, pageSize = 20) {
  const { data } = await client.get(`/students/${id}/deductions`, { params: { page, page_size: pageSize } });
  return data;
}
```

- [ ] **Step 2: Create frontend/src/api/orders.ts**

```typescript
import client from './client';

export async function getOrders(params: Record<string, any>) {
  const { data } = await client.get('/orders', { params });
  return data;
}

export async function getOrder(id: number) {
  const { data } = await client.get(`/orders/${id}`);
  return data;
}

export async function updateOrder(id: number, body: Record<string, any>) {
  const { data } = await client.put(`/orders/${id}`, body);
  return data;
}
```

- [ ] **Step 3: Create frontend/src/api/upload.ts**

```typescript
import client from './client';

export async function uploadErp(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await client.post('/upload/erp', formData);
  return data;
}

export async function confirmErp(body: Record<string, any>) {
  const { data } = await client.post('/upload/erp/confirm', body);
  return data;
}

export async function uploadLogistics(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await client.post('/upload/logistics', formData);
  return data;
}

export async function confirmLogistics(matchedIds: number[]) {
  const { data } = await client.post('/upload/logistics/confirm', matchedIds);
  return data;
}

export async function getBatches(page = 1, pageSize = 20) {
  const { data } = await client.get('/upload/batches', { params: { page, page_size: pageSize } });
  return data;
}
```

- [ ] **Step 4: Create frontend/src/api/stats.ts**

```typescript
import client from './client';

export async function getOverview() {
  const { data } = await client.get('/stats/overview');
  return data;
}

export async function getStudentStats(id: number) {
  const { data } = await client.get(`/stats/student/${id}`);
  return data;
}

export async function getTrends(params: { period?: string; type?: string; student_id?: number }) {
  const { data } = await client.get('/stats/trends', { params });
  return data;
}

export async function getChannelDistribution() {
  const { data } = await client.get('/stats/channel-distribution');
  return data;
}

export async function getStudentRanking() {
  const { data } = await client.get('/stats/student-ranking');
  return data;
}

export async function getLowBalance() {
  const { data } = await client.get('/stats/low-balance');
  return data;
}
```

---

### Task 19: StatCard component & Admin Dashboard

**Files:**
- Create: `frontend/src/components/StatCard/index.tsx`
- Create: `frontend/src/pages/admin/Dashboard/index.tsx`

- [ ] **Step 1: Create frontend/src/components/StatCard/index.tsx**

```typescript
import { Card, Statistic } from 'antd';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  prefix?: ReactNode;
  suffix?: string;
  color?: string;
  loading?: boolean;
}

export default function StatCard({ title, value, prefix, suffix, color, loading }: StatCardProps) {
  return (
    <Card loading={loading} bordered={false} style={{ borderRadius: 12 }}>
      <Statistic
        title={title}
        value={value}
        prefix={prefix}
        suffix={suffix}
        valueStyle={{ color: color || '#1677ff', fontWeight: 700 }}
      />
    </Card>
  );
}
```

- [ ] **Step 2: Create frontend/src/pages/admin/Dashboard/index.tsx**

```typescript
import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Tag, Spin } from 'antd';
import { WarningOutlined, TeamOutlined, ShoppingOutlined, DollarOutlined, MoneyCollectOutlined } from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import StatCard from '../../../components/StatCard';
import { getOverview, getTrends, getChannelDistribution, getStudentRanking, getLowBalance } from '../../../api/stats';

echarts.use([LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>({});
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [orderTrend, setOrderTrend] = useState<any[]>([]);
  const [channelDist, setChannelDist] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [lowBalance, setLowBalance] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      getOverview(),
      getTrends({ period: '30d', type: 'sales' }),
      getTrends({ period: '30d', type: 'orders' }),
      getChannelDistribution(),
      getStudentRanking(),
      getLowBalance(),
    ]).then(([ov, st, ot, cd, sr, lb]) => {
      setOverview(ov);
      setSalesTrend(st);
      setOrderTrend(ot);
      setChannelDist(cd);
      setRanking(sr);
      setLowBalance(lb);
    }).finally(() => setLoading(false));
  }, []);

  const salesOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: salesTrend.map((d: any) => d.date.slice(5)), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value' },
    series: [{ data: salesTrend.map((d: any) => d.value), type: 'line', smooth: true, areaStyle: { opacity: 0.15 }, itemStyle: { color: '#1677ff' } }],
  };

  const orderOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: orderTrend.map((d: any) => d.date.slice(5)), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value' },
    series: [{ data: orderTrend.map((d: any) => d.value), type: 'line', smooth: true, areaStyle: { opacity: 0.15 }, itemStyle: { color: '#52c41a' } }],
  };

  const pieOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{ type: 'pie', radius: ['45%', '70%'], data: channelDist, label: { show: false }, emphasis: { label: { show: true } } }],
  };

  const barOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 80, right: 20, top: 10, bottom: 20 },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: ranking.map((d: any) => d.name), inverse: true, axisLabel: { fontSize: 12 } },
    series: [{ data: ranking.map((d: any) => d.value), type: 'bar', itemStyle: { color: '#1677ff', borderRadius: [0, 4, 4, 0] } }],
  };

  const lowBalanceColumns = [
    { title: '学员', dataIndex: 'name', key: 'name' },
    { title: '余额', dataIndex: 'balance', key: 'balance', render: (v: number) => <Tag color="red">¥{v.toFixed(2)}</Tag> },
  ];

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={4}><StatCard title="学员总数" value={overview.student_count} prefix={<TeamOutlined />} suffix="人" /></Col>
        <Col xs={12} sm={8} lg={5}><StatCard title="本月订单" value={overview.month_orders} prefix={<ShoppingOutlined />} suffix="单" color="#52c41a" /></Col>
        <Col xs={12} sm={8} lg={5}><StatCard title="本月总运费" value={`¥${overview.month_freight}`} prefix={<DollarOutlined />} color="#fa8c16" /></Col>
        <Col xs={12} sm={8} lg={5}><StatCard title="本月净销售额" value={`$${overview.month_sales}`} prefix={<MoneyCollectOutlined />} color="#722ed1" /></Col>
        <Col xs={12} sm={8} lg={5}><StatCard title="低余额预警" value={overview.low_balance_count} prefix={<WarningOutlined />} suffix="人" color="#ff4d4f" /></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="净销售额趋势（近30天）" bordered={false}><ReactEChartsCore echarts={echarts} option={salesOption} style={{ height: 280 }} /></Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="订单数量趋势（近30天）" bordered={false}><ReactEChartsCore echarts={echarts} option={orderOption} style={{ height: 280 }} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="学员运费排名 Top10" bordered={false}><ReactEChartsCore echarts={echarts} option={barOption} style={{ height: 320 }} /></Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="物流渠道分布" bordered={false}><ReactEChartsCore echarts={echarts} option={pieOption} style={{ height: 320 }} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="低余额学员（< ¥50）" bordered={false}>
            <Table dataSource={lowBalance} columns={lowBalanceColumns} rowKey="id" pagination={false} size="small" />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
```

- [ ] **Step 3: Update App.tsx to use the Dashboard component**

In `frontend/src/App.tsx`, add import and replace placeholder:

```typescript
import AdminDashboard from './pages/admin/Dashboard';
// Replace: <Route path="dashboard" element={<div>管理后台看板</div>} />
// With: <Route path="dashboard" element={<AdminDashboard />} />
```

---

### Task 20: Students management page

**Files:**
- Create: `frontend/src/pages/admin/Students/index.tsx`

- [ ] **Step 1: Create frontend/src/pages/admin/Students/index.tsx**

```typescript
import { useEffect, useState } from 'react';
import { Table, Button, Input, Space, Tag, Modal, Form, InputNumber, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, WalletOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getStudents, createStudent, toggleStudent, rechargeStudent } from '../../../api/students';

export default function StudentsPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeId, setRechargeId] = useState<number | null>(null);
  const [createForm] = Form.useForm();
  const [rechargeForm] = Form.useForm();
  const navigate = useNavigate();

  const fetchData = () => {
    setLoading(true);
    getStudents({ page, page_size: 20, search: search || undefined })
      .then((res) => { setData(res.items); setTotal(res.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page]);

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '账号', dataIndex: 'username', key: 'username' },
    { title: '手机号', dataIndex: 'phone', key: 'phone', render: (v: string) => v || '-' },
    {
      title: '运费余额', dataIndex: 'balance', key: 'balance',
      render: (v: number) => (
        <Tag color={v < 50 ? 'red' : 'green'}>¥{v.toFixed(2)}</Tag>
      ),
    },
    { title: '订单数', dataIndex: 'order_count', key: 'order_count' },
    {
      title: '状态', dataIndex: 'is_active', key: 'is_active',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" type="link" onClick={() => navigate(`/admin/students/${record.id}`)}>详情</Button>
          <Button size="small" type="link" icon={<WalletOutlined />} onClick={() => { setRechargeId(record.id); setRechargeOpen(true); }}>充值</Button>
          <Popconfirm title={`确认${record.is_active ? '禁用' : '启用'}?`} onConfirm={async () => { await toggleStudent(record.id); fetchData(); }}>
            <Button size="small" type="link" danger={record.is_active}>{record.is_active ? '禁用' : '启用'}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleCreate = async (values: any) => {
    await createStudent(values);
    message.success('学员创建成功');
    setCreateOpen(false);
    createForm.resetFields();
    fetchData();
  };

  const handleRecharge = async (values: any) => {
    if (!rechargeId) return;
    await rechargeStudent(rechargeId, values.amount, values.remark);
    message.success('充值成功');
    setRechargeOpen(false);
    rechargeForm.resetFields();
    fetchData();
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <Input placeholder="搜索姓名/账号/手机号" prefix={<SearchOutlined />} value={search}
            onChange={(e) => setSearch(e.target.value)} onPressEnter={() => { setPage(1); fetchData(); }}
            style={{ width: 240 }} allowClear />
          <Button type="primary" onClick={() => { setPage(1); fetchData(); }}>搜索</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新增学员</Button>
      </div>

      <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
        pagination={{ total, current: page, onChange: setPage, showTotal: (t) => `共 ${t} 人` }} />

      <Modal title="新增学员" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => createForm.submit()}>
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="学员姓名" />
          </Form.Item>
          <Form.Item name="phone" label="手机号"><Input placeholder="手机号" /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea placeholder="备注信息" rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="充值" open={rechargeOpen} onCancel={() => setRechargeOpen(false)} onOk={() => rechargeForm.submit()}>
        <Form form={rechargeForm} layout="vertical" onFinish={handleRecharge}>
          <Form.Item name="amount" label="充值金额" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber min={0.01} step={0.01} precision={2} style={{ width: '100%' }} prefix="¥" placeholder="0.00" />
          </Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea placeholder="充值备注" rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
```

---

### Task 21: Student detail page

**Files:**
- Create: `frontend/src/pages/admin/StudentDetail/index.tsx`

- [ ] **Step 1: Create frontend/src/pages/admin/StudentDetail/index.tsx**

```typescript
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Descriptions, Tabs, Table, Button, Tag, Spin, message } from 'antd';
import { getStudent, getRecharges, getDeductions, rechargeStudent } from '../../../api/students';
import { getOrders } from '../../../api/orders';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) getStudent(Number(id)).then(setStudent).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;
  if (!student) return <div>学员不存在</div>;

  return (
    <div>
      <Card title="学员信息" bordered={false} style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }}>
          <Descriptions.Item label="姓名">{student.name}</Descriptions.Item>
          <Descriptions.Item label="账号">{student.username}</Descriptions.Item>
          <Descriptions.Item label="手机号">{student.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="备注">{student.remark || '-'}</Descriptions.Item>
          <Descriptions.Item label="运费余额">
            <Tag color={student.balance < 50 ? 'red' : 'green'} style={{ fontSize: 16 }}>¥{student.balance.toFixed(2)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="订单数">{student.order_count}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card bordered={false}>
        <Tabs defaultActiveKey="recharges" items={[
          {
            key: 'recharges', label: '充值记录',
            children: <RechargeTab studentId={Number(id)} />,
          },
          {
            key: 'deductions', label: '扣费记录',
            children: <DeductionTab studentId={Number(id)} />,
          },
          {
            key: 'orders', label: '订单列表',
            children: <OrderTab studentId={Number(id)} />,
          },
        ]} />
      </Card>
    </div>
  );
}

function RechargeTab({ studentId }: { studentId: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setLoading(true); getRecharges(studentId).then(res => setData(res.items)).finally(() => setLoading(false)); }, [studentId]);

  const columns = [
    { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => <span style={{ color: '#52c41a' }}>+¥{v.toFixed(2)}</span> },
    { title: '充值前', dataIndex: 'balance_before', key: 'balance_before', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '充值后', dataIndex: 'balance_after', key: 'balance_after', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '备注', dataIndex: 'remark', key: 'remark', render: (v: string) => v || '-' },
  ];

  return <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />;
}

function DeductionTab({ studentId }: { studentId: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setLoading(true); getDeductions(studentId).then(res => setData(res.items)).finally(() => setLoading(false)); }, [studentId]);

  const columns = [
    { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => <span style={{ color: '#ff4d4f' }}>-¥{v.toFixed(2)}</span> },
    { title: '扣费前', dataIndex: 'balance_before', key: 'balance_before', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '扣费后', dataIndex: 'balance_after', key: 'balance_after', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '订单ID', dataIndex: 'order_id', key: 'order_id' },
  ];

  return <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />;
}

function OrderTab({ studentId }: { studentId: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setLoading(true); getOrders({ student_id: studentId, page_size: 100 }).then(res => setData(res.items)).finally(() => setLoading(false)); }, [studentId]);

  const columns = [
    { title: '订单ID', dataIndex: 'erp_order_id', key: 'erp_order_id' },
    { title: '时间', dataIndex: 'order_time', key: 'order_time', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
    { title: 'ASIN', dataIndex: 'asin', key: 'asin' },
    { title: '运费', dataIndex: 'freight', key: 'freight', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '服务费', dataIndex: 'service_fee', key: 'service_fee', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '打包费', dataIndex: 'packing_fee', key: 'packing_fee', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '总费用', dataIndex: 'total_cost', key: 'total_cost', render: (v: number) => <strong>¥{v.toFixed(2)}</strong> },
    { title: '状态', dataIndex: 'status', key: 'status' },
  ];

  return <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />;
}
```

---

### Task 22: Orders management page

**Files:**
- Create: `frontend/src/pages/admin/Orders/index.tsx`

- [ ] **Step 1: Create frontend/src/pages/admin/Orders/index.tsx**

```typescript
import { useEffect, useState } from 'react';
import { Table, Select, DatePicker, Input, Space, Button, Image, Tag } from 'antd';
import { SearchOutlined, ExportOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getOrders } from '../../../api/orders';
import { getStudents } from '../../../api/students';

const { RangePicker } = DatePicker;

export default function OrdersPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [students, setStudents] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});

  useEffect(() => {
    getStudents({ page_size: 1000 }).then(res => setStudents(res.items));
  }, []);

  const fetchData = () => {
    setLoading(true);
    getOrders({ page, page_size: 20, ...filters })
      .then(res => { setData(res.items); setTotal(res.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page, filters]);

  const columns = [
    { title: '订单ID', dataIndex: 'erp_order_id', key: 'erp_order_id', width: 110 },
    { title: '学员', dataIndex: 'student_name', key: 'student_name', width: 80 },
    { title: '时间', dataIndex: 'order_time', key: 'order_time', width: 140, render: (v: string) => v ? dayjs(v).format('MM-DD HH:mm') : '-' },
    { title: 'ASIN', dataIndex: 'asin', key: 'asin', width: 120 },
    { title: '毛重(g)', dataIndex: 'gross_weight', key: 'gross_weight', width: 80 },
    { title: '运费', dataIndex: 'freight', key: 'freight', width: 70, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '服务费', dataIndex: 'service_fee', key: 'service_fee', width: 70, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '打包费', dataIndex: 'packing_fee', key: 'packing_fee', width: 70, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '总费用', dataIndex: 'total_cost', key: 'total_cost', width: 80, render: (v: number) => <strong>¥{v.toFixed(2)}</strong> },
    { title: '结余', dataIndex: 'balance_amount', key: 'balance_amount', width: 70, render: (v: number) => v != null ? `$${v.toFixed(2)}` : '-' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
    {
      title: '图片', dataIndex: 'image_url', key: 'image_url', width: 60,
      render: (v: string) => v ? <Image src={v} width={32} height={32} style={{ objectFit: 'cover', borderRadius: 4 }} /> : '-',
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Select placeholder="选择学员" allowClear style={{ width: 160 }}
          onChange={(v) => setFilters(prev => ({ ...prev, student_id: v }))}
          options={students.map(s => ({ value: s.id, label: s.name }))} />
        <RangePicker onChange={(dates) => {
          setFilters(prev => ({
            ...prev,
            start_date: dates?.[0]?.format('YYYY-MM-DD'),
            end_date: dates?.[1]?.format('YYYY-MM-DD'),
          }));
        }} />
        <Input placeholder="搜索ID/ASIN/追踪号" prefix={<SearchOutlined />} style={{ width: 200 }}
          onPressEnter={(e) => setFilters(prev => ({ ...prev, search: (e.target as HTMLInputElement).value }))} />
        <Button type="primary" onClick={fetchData}>查询</Button>
        <Button icon={<ExportOutlined />} href="/api/orders/export" target="_blank">导出</Button>
      </div>

      <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
        pagination={{ total, current: page, onChange: setPage, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 1200 }} size="small" />
    </div>
  );
}
```

---

### Task 23: File upload page

**Files:**
- Create: `frontend/src/pages/admin/Upload/index.tsx`

- [ ] **Step 1: Create frontend/src/pages/admin/Upload/index.tsx**

```typescript
import { useState } from 'react';
import { Card, Upload, Button, Table, Modal, Tag, message, Space, Select, Alert, Checkbox } from 'antd';
import { InboxOutlined, CloudUploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { uploadErp, confirmErp, uploadLogistics, confirmLogistics } from '../../../api/upload';

const { Dragger } = Upload;

export default function UploadPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
      <ErpUpload />
      <LogisticsUpload />
    </div>
  );
}

function ErpUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [duplicateDecisions, setDuplicateDecisions] = useState<Record<string, string>>({});
  const [showDupModal, setShowDupModal] = useState(false);
  const [confirmedStudents, setConfirmedStudents] = useState<string[]>([]);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await uploadErp(file);
      setPreview(res);
      setConfirmedStudents(res.new_students?.map((s: any) => s.name) || []);
      if (res.duplicates?.length > 0) setShowDupModal(true);
    } catch (e: any) {
      message.error(e.response?.data?.detail || '上传失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);
    try {
      const res = await confirmErp({
        duplicate_decisions: duplicateDecisions,
        confirmed_students: confirmedStudents,
        rows_to_import: preview.preview,
      });
      message.success(`导入成功: ${res.success_rows} 条, 跳过: ${res.skip_rows} 条, 新学员: ${res.new_students} 人`);
      setPreview(null);
      setFile(null);
    } catch (e: any) {
      message.error(e.response?.data?.detail || '确认导入失败');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Card title="ERP 文件上传" bordered={false}>
      <Dragger beforeUpload={(f) => { setFile(f); return false; }} maxCount={1} onRemove={() => { setFile(null); setPreview(null); }}
        accept=".xlsx" disabled={loading}>
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">点击或拖拽 ERP 导出文件到此区域</p>
        <p className="ant-upload-hint">支持 .xlsx 格式</p>
      </Dragger>
      <Button type="primary" onClick={handleUpload} loading={loading} disabled={!file} block style={{ marginTop: 12 }} icon={<CloudUploadOutlined />}>
        解析预览
      </Button>

      {preview && (
        <div style={{ marginTop: 16 }}>
          <Alert message={`共 ${preview.summary.total_rows} 条, 新增 ${preview.summary.new_rows} 条, 重复 ${preview.summary.duplicate_rows} 条`} type="info" style={{ marginBottom: 12 }} />
          {preview.new_students?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <span>新学员确认：</span>
              <Checkbox.Group options={preview.new_students.map((s: any) => ({
                label: s.is_duplicate_name ? `⚠ ${s.name} (重名) → 账号: ${s.username}` : `${s.name} → 账号: ${s.username}`,
                value: s.name,
              }))} value={confirmedStudents} onChange={(vals) => setConfirmedStudents(vals as string[])} />
            </div>
          )}
          <Table dataSource={preview.preview.slice(0, 10)} columns={[
            { title: '订单ID', dataIndex: 'erp_order_id', width: 100 },
            { title: '学员', dataIndex: 'student_name', width: 80 },
            { title: '总费用', dataIndex: 'total_cost', width: 80, render: (v: number) => `¥${v.toFixed(2)}` },
            { title: '匹配', dataIndex: 'student_match', width: 60, render: (v: string) => v === 'matched' ? <Tag color="green">已匹配</Tag> : <Tag color="blue">新学员</Tag> },
          ]} rowKey="erp_order_id" size="small" pagination={false} />
          <Button type="primary" onClick={handleConfirm} loading={confirming} block style={{ marginTop: 12 }}>确认导入</Button>
        </div>
      )}

      <Modal title="重复订单处理" open={showDupModal} onCancel={() => setShowDupModal(false)} footer={null} width={700}>
        {preview?.duplicates?.map((dup: any) => (
          <Card key={dup.erp_order_id} size="small" style={{ marginBottom: 8 }}>
            <p><strong>订单ID: {dup.erp_order_id}</strong> — 差异字段: {dup.diff_fields.join(', ')}</p>
            <Select style={{ width: '100%' }} placeholder="选择处理方式"
              value={duplicateDecisions[dup.erp_order_id]}
              onChange={(v) => setDuplicateDecisions(prev => ({ ...prev, [dup.erp_order_id]: v }))}
              options={[
                { value: 'keep_old', label: '保留旧数据' },
                { value: 'replace', label: '替换为新数据' },
                { value: 'merge', label: '智能合并（新数据补充空字段）' },
              ]} />
          </Card>
        ))}
        <Button type="primary" block onClick={() => setShowDupModal(false)} style={{ marginTop: 8 }}>确认处理</Button>
      </Modal>
    </Card>
  );
}

function LogisticsUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await uploadLogistics(file);
      setPreview(res);
    } catch (e: any) {
      message.error(e.response?.data?.detail || '上传失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);
    try {
      const matchedIds = preview.matched.map((m: any) => m.order_id);
      const res = await confirmLogistics(matchedIds);
      message.success(`更新完成: ${res.updated_rows} 条`);
      setPreview(null);
      setFile(null);
    } catch (e: any) {
      message.error(e.response?.data?.detail || '确认失败');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Card title="物流明细上传" bordered={false}>
      <Dragger beforeUpload={(f) => { setFile(f); return false; }} maxCount={1} onRemove={() => { setFile(null); setPreview(null); }}
        accept=".xlsx" disabled={loading}>
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">点击或拖拽物流明细文件到此区域</p>
        <p className="ant-upload-hint">支持 .xlsx 格式</p>
      </Dragger>
      <Button type="primary" onClick={handleUpload} loading={loading} disabled={!file} block style={{ marginTop: 12 }} icon={<CloudUploadOutlined />}>
        解析预览
      </Button>

      {preview && (
        <div style={{ marginTop: 16 }}>
          <Alert message={`共 ${preview.summary.total} 条, 匹配 ${preview.summary.matched} 条, 未匹配 ${preview.summary.unmatched} 条`}
            type={preview.summary.unmatched > 0 ? 'warning' : 'success'} style={{ marginBottom: 12 }} />
          <Table dataSource={preview.matched} columns={[
            { title: '物流ID', dataIndex: 'logistics_id', width: 100 },
            { title: '订单ID', dataIndex: 'erp_order_id', width: 100 },
            { title: '重量(g)', dataIndex: 'weight', width: 80 },
          ]} rowKey="logistics_id" size="small" pagination={false} />
          <Button type="primary" onClick={handleConfirm} loading={confirming} block style={{ marginTop: 12 }}>确认导入</Button>
        </div>
      )}
    </Card>
  );
}
```

---

### Task 24: Batches & remaining pages

**Files:**
- Create: `frontend/src/pages/admin/Batches/index.tsx`
- Create: `frontend/src/pages/student/Dashboard/index.tsx`
- Create: `frontend/src/pages/student/Orders/index.tsx`
- Create: `frontend/src/pages/student/Billing/index.tsx`

- [ ] **Step 1: Create frontend/src/pages/admin/Batches/index.tsx**

```typescript
import { useEffect, useState } from 'react';
import { Table, Tag } from 'antd';
import { getBatches } from '../../../api/upload';

export default function BatchesPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    getBatches(page).then(res => { setData(res.items); setTotal(res.total); }).finally(() => setLoading(false));
  }, [page]);

  const columns = [
    { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    { title: '类型', dataIndex: 'file_type', key: 'file_type', render: (v: string) => <Tag color={v === 'erp' ? 'blue' : 'green'}>{v === 'erp' ? 'ERP文件' : '物流明细'}</Tag> },
    { title: '文件名', dataIndex: 'file_name', key: 'file_name' },
    { title: '总行数', dataIndex: 'total_rows', key: 'total_rows' },
    { title: '成功', dataIndex: 'success_rows', key: 'success_rows' },
    { title: '跳过', dataIndex: 'skip_rows', key: 'skip_rows' },
    { title: '新学员', dataIndex: 'new_students', key: 'new_students' },
  ];

  return <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
    pagination={{ total, current: page, onChange: setPage }} />;
}
```

- [ ] **Step 2: Create frontend/src/pages/student/Dashboard/index.tsx**

```typescript
import { useEffect, useState } from 'react';
import { Row, Col, Card, Spin } from 'antd';
import { WalletOutlined, ShoppingOutlined, DollarOutlined, MoneyCollectOutlined } from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import StatCard from '../../../components/StatCard';
import { useAuth } from '../../../contexts/AuthContext';
import { getStudentStats, getTrends } from '../../../api/stats';
import { getOrders } from '../../../api/orders';

echarts.use([LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [orderTrend, setOrderTrend] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getStudentStats(user.id),
      getTrends({ period: '30d', type: 'sales', student_id: user.id }),
      getTrends({ period: '30d', type: 'orders', student_id: user.id }),
      getOrders({ student_id: user.id, page_size: 10 }),
    ]).then(([st, stData, otData, orders]) => {
      setStats(st);
      setSalesTrend(stData);
      setOrderTrend(otData);
      setRecentOrders(orders.items);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;

  const salesOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: salesTrend.map((d: any) => d.date.slice(5)), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value' },
    series: [{ data: salesTrend.map((d: any) => d.value), type: 'line', smooth: true, areaStyle: { opacity: 0.15 }, itemStyle: { color: '#722ed1' } }],
  };

  const orderOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: orderTrend.map((d: any) => d.date.slice(5)), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value' },
    series: [{ data: orderTrend.map((d: any) => d.value), type: 'line', smooth: true, areaStyle: { opacity: 0.15 }, itemStyle: { color: '#52c41a' } }],
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}><StatCard title="当前余额" value={`¥${stats.balance}`} prefix={<WalletOutlined />} color={stats.balance < 50 ? '#ff4d4f' : '#1677ff'} /></Col>
        <Col xs={12} sm={6}><StatCard title="本月订单" value={stats.month_orders} prefix={<ShoppingOutlined />} suffix="单" color="#52c41a" /></Col>
        <Col xs={12} sm={6}><StatCard title="本月运费" value={`¥${stats.month_freight}`} prefix={<DollarOutlined />} color="#fa8c16" /></Col>
        <Col xs={12} sm={6}><StatCard title="本月净销售额" value={`$${stats.month_sales}`} prefix={<MoneyCollectOutlined />} color="#722ed1" /></Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="净销售额趋势" bordered={false}><ReactEChartsCore echarts={echarts} option={salesOption} style={{ height: 280 }} /></Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="订单数量趋势" bordered={false}><ReactEChartsCore echarts={echarts} option={orderOption} style={{ height: 280 }} /></Card>
        </Col>
      </Row>
    </div>
  );
}
```

- [ ] **Step 3: Create frontend/src/pages/student/Orders/index.tsx**

```typescript
import OrdersPage from '../../admin/Orders';
export default OrdersPage;
```

- [ ] **Step 4: Create frontend/src/pages/student/Billing/index.tsx**

```typescript
import { useEffect, useState } from 'react';
import { Card, Tabs, Table, Tag } from 'antd';
import { useAuth } from '../../../contexts/AuthContext';
import { getRecharges, getDeductions } from '../../../api/students';

export default function BillingPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Card bordered={false}>
      <Tabs items={[
        { key: 'recharges', label: '充值记录', children: <BillTab type="recharge" studentId={user.id} /> },
        { key: 'deductions', label: '扣费记录', children: <BillTab type="deduction" studentId={user.id} /> },
      ]} />
    </Card>
  );
}

function BillTab({ type, studentId }: { type: string; studentId: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetcher = type === 'recharge' ? getRecharges : getDeductions;
    fetcher(studentId).then(res => setData(res.items)).finally(() => setLoading(false));
  }, [type, studentId]);

  const columns = type === 'recharge' ? [
    { title: '时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    { title: '金额', dataIndex: 'amount', render: (v: number) => <span style={{ color: '#52c41a' }}>+¥{v.toFixed(2)}</span> },
    { title: '充值前', dataIndex: 'balance_before', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '充值后', dataIndex: 'balance_after', render: (v: number) => `¥${v.toFixed(2)}` },
  ] : [
    { title: '时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    { title: '金额', dataIndex: 'amount', render: (v: number) => <span style={{ color: '#ff4d4f' }}>-¥{v.toFixed(2)}</span> },
    { title: '扣费前', dataIndex: 'balance_before', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '扣费后', dataIndex: 'balance_after', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '订单ID', dataIndex: 'order_id' },
  ];

  return <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />;
}
```

---

### Task 25: Finalize App.tsx with all routes

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update App.tsx with all page imports**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, AdminRoute, StudentRoute } from './components/RouteGuard';
import AppLayout from './components/Layout';
import LoginPage from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import StudentsPage from './pages/admin/Students';
import StudentDetailPage from './pages/admin/StudentDetail';
import OrdersPage from './pages/admin/Orders';
import UploadPage from './pages/admin/Upload';
import BatchesPage from './pages/admin/Batches';
import StudentDashboard from './pages/student/Dashboard';
import StudentOrders from './pages/student/Orders';
import BillingPage from './pages/student/Billing';

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
      }}
    >
      <AntApp>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<ProtectedRoute><AdminRoute><AppLayout /></AdminRoute></ProtectedRoute>}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="students/:id" element={<StudentDetailPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="batches" element={<BatchesPage />} />
              </Route>
              <Route path="/student" element={<ProtectedRoute><StudentRoute><AppLayout /></StudentRoute></ProtectedRoute>}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="orders" element={<StudentOrders />} />
                <Route path="billing" element={<BillingPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}
```

- [ ] **Step 2: Start frontend and verify routing**

Run: `cd frontend && npm run dev`
Expected: Dev server starts. Navigate to http://localhost:5173/login — login page renders.
Login as admin/admin123 → redirects to /admin/dashboard.

---

## Phase 5: Integration & Polish

### Task 26: End-to-end integration test

- [ ] **Step 1: Test login flow**

Run backend: `cd backend && uvicorn app.main:app --reload --port 8000`
Run frontend: `cd frontend && npm run dev`
Open http://localhost:5173/login → Login as admin/admin123 → Should redirect to dashboard.

- [ ] **Step 2: Test student CRUD**

In admin panel → Students → Create new student "测试学员" → Verify student appears in list → Click detail → View tabs.

- [ ] **Step 3: Test ERP file upload**

In admin panel → Upload → Drag the sample ERP file `sucai/导出订单20260514055011.xlsx` → Click "解析预览" → Verify preview shows data → Confirm import.

- [ ] **Step 4: Test logistics file upload**

Upload `sucai/美国特快专线-物流费用统计0514.xlsx` → Verify weight matching preview → Confirm.

- [ ] **Step 5: Test student login**

Create student "管林海" via upload or manually → Login as guanlinhai/guanlinhai → Verify dashboard shows personal data.

- [ ] **Step 6: Test dashboard charts**

Admin dashboard → Verify all charts render (sales trend, order trend, bar chart, pie chart).

- [ ] **Step 7: Test mobile responsive**

Open Chrome DevTools → Toggle device toolbar → Set to iPhone 14 → Verify layout switches to mobile (drawer menu, responsive tables).

---

### Task 27: UI Polish with frontend-design skill

- [ ] **Step 1: Invoke frontend-design skill**

Use the `frontend-design` skill to enhance the visual quality of:
- Login page (gradient background, card effects, brand identity)
- Admin dashboard (stat card designs, chart theming, modern layout)
- Student list (table styling, tag designs, action buttons)
- Upload page (drag-and-drop area design, preview animations)
- Mobile responsiveness polish

The skill will produce high-quality CSS/component refinements for modern简约科技风.

---

## Self-Review Checklist

**1. Spec coverage:**
- ✅ Student management (CRUD, toggle, recharge, deductions) → Tasks 7, 20, 21
- ✅ Excel ERP upload with field validation → Task 10, 23
- ✅ Excel logistics upload with ID matching → Task 10, 23
- ✅ Name extraction from "来源" field → Task 9
- ✅ Auto-create student accounts with pinyin → Tasks 4, 10
- ✅ Duplicate order handling (keep_old/replace/merge) → Tasks 10, 23
- ✅ Low balance warning (< 50) → Tasks 11, 19
- ✅ Cost calculation (freight + service_fee + packing_fee) → Task 9
- ✅ Image URL display in order list → Task 22
- ✅ Balance/net sales (结余) → Tasks 9, 11
- ✅ Gross weight from logistics → Tasks 10, 23
- ✅ Data dashboard with charts → Tasks 11, 19, 24
- ✅ PC responsive + mobile → Tasks 15, 27
- ✅ JWT auth + role-based access → Tasks 3, 6, 14, 15
- ✅ Duplicate name handling → Tasks 4, 10

**2. Placeholder scan:** No TBD, TODO, or vague instructions found. All steps have concrete code or commands.

**3. Type consistency:**
- All API response types match between backend schemas and frontend API modules
- Route paths consistent between App.tsx and Layout menu items
- Model field names consistent across models, schemas, and routers

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-14-logistics-order-system.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach would you prefer?