from celery import Celery

from app.core.config import settings

celery_app = Celery("bmns_worker", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Dhaka",
    enable_utc=False,
)
celery_app.autodiscover_tasks(["app.tasks"])
