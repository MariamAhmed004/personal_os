from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: UUID
    email: EmailStr
    display_name: str

    model_config = ConfigDict(from_attributes=True)


class TokenRead(BaseModel):
    access_token: str
    token_type: str = "bearer"
