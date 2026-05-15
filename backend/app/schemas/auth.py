from typing import Optional

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
    phone: Optional[str] = None
    balance: float

    class Config:
        from_attributes = True