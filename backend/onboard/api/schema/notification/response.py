from datetime import datetime

from pydantic import BaseModel, ConfigDict

from onboard.dao.models.notification import NotificationType


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: NotificationType
    title: str
    body: str | None
    link: str | None
    read_at: datetime | None
    created_at: datetime


class UnreadCountResponse(BaseModel):
    unread: int
