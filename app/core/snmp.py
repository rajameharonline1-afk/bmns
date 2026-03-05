from __future__ import annotations

import asyncio
from typing import Iterable

from pysnmp.hlapi import asyncio as aio


def snmp_ping(host: str, port: int, community: str | None, timeout: float = 1.5, retries: int = 1):
    community_value = community or "public"

    async def run():
        transport = await aio.UdpTransportTarget.create((host, port), timeout=timeout, retries=retries)
        return await aio.get_cmd(
            aio.SnmpEngine(),
            aio.CommunityData(community_value, mpModel=1),
            transport,
            aio.ContextData(),
            aio.ObjectType(aio.ObjectIdentity("SNMPv2-MIB", "sysUpTime", 0)),
        )

    try:
        error_indication, error_status, error_index, _var_binds = asyncio.run(run())
    except Exception as exc:  # pragma: no cover
        return False, f"pysnmp error: {exc}"

    if error_indication:
        return False, str(error_indication)
    if error_status:
        return False, f"{error_status.prettyPrint()} at {error_index}"
    return True, None


def snmp_bulk_walk(
    host: str,
    port: int,
    community: str | None,
    root_oid: str,
    max_rows: int = 2000,
    timeout: float = 1.0,
    retries: int = 1,
) -> list[tuple[str, str]]:
    community_value = community or "public"

    async def run() -> list[tuple[str, str]]:
        transport = await aio.UdpTransportTarget.create((host, port), timeout=timeout, retries=retries)
        results: list[tuple[str, str]] = []
        oid = aio.ObjectIdentity(root_oid)
        while len(results) < max_rows:
            error_indication, error_status, error_index, var_binds = await aio.bulk_cmd(
                aio.SnmpEngine(),
                aio.CommunityData(community_value, mpModel=1),
                transport,
                aio.ContextData(),
                0,
                10,
                aio.ObjectType(oid),
                lexicographicMode=False,
            )
            if error_indication or error_status:
                break
            if not var_binds:
                break
            stop = False
            for vb in var_binds:
                o, v = vb
                o_str = str(o)
                if not o_str.startswith(root_oid + "."):
                    stop = True
                    break
                results.append((o_str, str(v)))
                oid = aio.ObjectIdentity(o_str)
                if len(results) >= max_rows:
                    stop = True
                    break
            if stop:
                break
        return results

    return asyncio.run(run())
