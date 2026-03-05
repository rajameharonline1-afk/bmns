from __future__ import annotations

from typing import Any

import routeros_api


def snmp_sysname(host: str, community: str = "public", version: int = 2, timeout: int = 2) -> str:
    try:
        from easysnmp import Session
    except Exception as exc:
        return f"EasySNMP unavailable: {exc}"

    try:
        session = Session(hostname=host, community=community, version=version, timeout=timeout)
        response = session.get("sysName.0")
        return str(response.value)
    except Exception as exc:
        return f"SNMP failed: {exc}"


def routeros_system_identity(host: str, username: str, password: str, port: int = 8728) -> dict[str, Any]:
    pool = None
    try:
        pool = routeros_api.RouterOsApiPool(
            host,
            username=username,
            password=password,
            port=port,
            plaintext_login=True,
        )
        api = pool.get_api()
        resource = api.get_resource("/system/identity")
        rows = resource.get()
        return rows[0] if rows else {}
    except Exception as exc:
        return {"error": str(exc)}
    finally:
        if pool is not None:
            pool.disconnect()
