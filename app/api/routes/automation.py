from celery.result import AsyncResult
from fastapi import APIRouter

from app.core.celery_app import celery_app
from app.schemas.automation import CeleryTaskStatusResponse, DeviceSnapshotRequest, DeviceSnapshotTaskResponse
from app.tasks.network import collect_device_snapshot

router = APIRouter()


@router.post("/snapshot", response_model=DeviceSnapshotTaskResponse)
def enqueue_snapshot(payload: DeviceSnapshotRequest) -> DeviceSnapshotTaskResponse:
    task = collect_device_snapshot.delay(
        host=payload.host,
        snmp_community=payload.snmp_community,
        routeros_username=payload.routeros_username,
        routeros_password=payload.routeros_password,
        routeros_port=payload.routeros_port,
    )
    return DeviceSnapshotTaskResponse(task_id=task.id, status="queued")


@router.get("/tasks/{task_id}", response_model=CeleryTaskStatusResponse)
def get_task_status(task_id: str) -> CeleryTaskStatusResponse:
    task = AsyncResult(task_id, app=celery_app)
    result = task.result if task.successful() else None
    if task.failed():
        result = str(task.result)
    return CeleryTaskStatusResponse(task_id=task_id, status=task.status, result=result)
