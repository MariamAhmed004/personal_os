from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.base import Base
from app.database.session import engine
from app.features.auth import models as auth_models
from app.features.auth.routes import router as auth_router, users_router
from app.features.backlog import models as backlog_models
from app.features.backlog.routes import router as backlog_router
from app.features.ai.routes import router as ai_router
from app.features.calendar import models as calendar_models
from app.features.calendar.routes import router as calendar_router
from app.features.chat import models as chat_models
from app.features.daily_sheet import models as daily_sheet_models
from app.features.daily_sheet.routes import router as daily_sheet_router
from app.features.habits import models as habit_models
from app.features.habits.routes import router as habits_router
from app.features.mood import models as mood_models
from app.features.mood.routes import router as mood_router
from app.features.reflections import models as reflection_models
from app.features.reflections.routes import router as reflections_router
from app.features.suggestions import models as suggestion_models


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}


for router in (
    auth_router,
    users_router,
    ai_router,
    habits_router,
    calendar_router,
    backlog_router,
    daily_sheet_router,
    mood_router,
    reflections_router,
):
    app.include_router(router, prefix=settings.api_v1_prefix)
