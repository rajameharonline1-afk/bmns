from __future__ import annotations

from app.core.celery_app import celery_app
from app.core.network_automation import routeros_system_identity, snmp_sysname


@celery_app.task(name="network.collect_device_snapshot")
def collect_device_snapshot(
    host: str,
    snmp_community: str = "public",
    routeros_username: str = "admin",
    routeros_password: str = "",
    routeros_port: int = 8728,
) -> dict:
    return {
        "host": host,
        "snmp_sysname": snmp_sysname(host=host, community=snmp_community),
        "routeros_identity": routeros_system_identity(
            host=host,
            username=routeros_username,
            password=routeros_password,
            port=routeros_port,
        ),
    }
