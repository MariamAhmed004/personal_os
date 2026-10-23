from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.database.session import get_db
from app.features.auth.models import User
from app.features.auth.schemas import LoginRequest, TokenRead, UserCreate, UserRead
from app.shared.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
users_router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    user = User(email=data.email.lower(), display_name=data.display_name, hashed_password=hash_password(data.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists") from None
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenRead)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if user is None or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenRead(access_token=create_access_token(str(user.id)))


@users_router.get("/me", response_model=UserRead)
def get_me(user: User = Depends(get_current_user)):
    return user
