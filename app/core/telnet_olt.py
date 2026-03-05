from __future__ import annotations

import os
import re
import socket
import time

from app.models.olt import Olt

IAC = 255
DO = 253
DONT = 254
WILL = 251
WONT = 252

DEFAULT_TELNET_PORT = int(os.getenv("BMNS_TELNET_PORT", "23"))
DEFAULT_TIMEOUT = float(os.getenv("BMNS_TELNET_TIMEOUT", "4.0"))
DEFAULT_ENABLE_WITH_LOGIN_PASSWORD = os.getenv("BMNS_TELNET_ENABLE_WITH_LOGIN_PASSWORD", "1") == "1"
DEFAULT_RETRY_ATTEMPTS = int(os.getenv("BMNS_TELNET_RETRY_ATTEMPTS", "5"))
DEFAULT_RETRY_BACKOFF = float(os.getenv("BMNS_TELNET_RETRY_BACKOFF", "2.0"))

ONU_ID_RE = re.compile(r"(EPON0/\d+:\d+)", re.IGNORECASE)
DATE_RE = re.compile(r"\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2}")
ALIVE_RE = re.compile(r"(?:\d+\s+)?\d{2}:\d{2}:\d{2}")
PON_CTX_RE = re.compile(r"interface\s+epon\s+0/(\d+)", re.IGNORECASE)
ONU_DESC_RE = re.compile(r"onu\s+(\d+)\s+description\s+(.+)$", re.IGNORECASE)
ONU_VLAN_RE = re.compile(r"onu\s+(\d+)\s+.*\bvlan\b.*", re.IGNORECASE)


def _normalize_onu_id(value: str) -> str:
    match = ONU_ID_RE.search(value)
    if not match:
        return value.strip()
    return match.group(1).upper()


def _clean_telnet_text(text: str) -> str:
    cleaned = text.replace("\r", "\n")
    cleaned = cleaned.replace("\x00", " ")
    cleaned = cleaned.replace("\x08", "")
    cleaned = cleaned.replace("--More--", " ")
    # Fix wrapped timestamps such as HH:MM:\nSS.
    cleaned = re.sub(r"(\d{2}:\d{2}):\s*\n\s*(\d{2})", r"\1:\2", cleaned)
    return cleaned


def _has_cli_error(output: str) -> bool:
    lowered = output.lower()
    return (
        "% unknown command" in lowered
        or "% command incomplete" in lowered
        or "% invalid input" in lowered
        or "error:" in lowered
    )


def _is_login_failed(output: str) -> bool:
    lowered = output.lower()
    return (
        "bad username" in lowered
        or "bad password" in lowered
        or "login failed" in lowered
        or "open too much users" in lowered
        or "too many failer" in lowered
        or "too many failure" in lowered
    )


def _parse_onu_id(onu_id: str) -> tuple[int | None, int | None]:
    match = re.search(r"EPON0/(\d+):(\d+)", onu_id, flags=re.IGNORECASE)
    if not match:
        return None, None
    return int(match.group(1)), int(match.group(2))


def _parse_status_table(output: str) -> dict[str, dict[str, object]]:
    metrics: dict[str, dict[str, object]] = {}
    text = _clean_telnet_text(output)
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or not ONU_ID_RE.match(line):
            continue
        parts = re.split(r"\s{2,}", line)
        if len(parts) < 8:
            continue

        onu_id = _normalize_onu_id(parts[0])
        payload = metrics.setdefault(onu_id, {})
        status_raw = parts[1].strip().lower() if len(parts) > 1 else ""
        if status_raw == "online":
            payload["status"] = "Online"
        elif status_raw == "offline":
            payload["status"] = "Offline"

        distance_raw = parts[3].strip() if len(parts) > 3 else ""
        if distance_raw.isdigit():
            payload["distance_m"] = int(distance_raw)

        last_reg_time = parts[5].strip() if len(parts) > 5 else ""
        if last_reg_time and last_reg_time.upper() != "N/A":
            payload["lrt"] = last_reg_time

        last_dereg_time = parts[6].strip() if len(parts) > 6 else ""
        last_dereg_reason = parts[7].strip() if len(parts) > 7 else ""
        time_text = "" if last_dereg_time.upper() == "N/A" else last_dereg_time
        reason_text = "" if last_dereg_reason.upper() == "N/A" else last_dereg_reason

        if reason_text and time_text:
            payload["ldr"] = f"{reason_text}\n{time_text}"
        elif reason_text:
            payload["ldr"] = reason_text
        elif time_text:
            payload["ldr"] = time_text

    return metrics


def _parse_opm_table(output: str) -> dict[str, dict[str, object]]:
    metrics: dict[str, dict[str, object]] = {}
    text = _clean_telnet_text(output)
    for raw_line in text.splitlines():
        line = " ".join(raw_line.split())
        if not line:
            continue
        onu_match = ONU_ID_RE.search(line)
        if not onu_match:
            continue
        onu_id = _normalize_onu_id(onu_match.group(1))
        # RX Power(dBm) is the last numeric value on each ONU row.
        rx_match = re.search(r"(-?\d+(?:\.\d+)?)\s*$", line)
        if not rx_match:
            continue
        try:
            signal_dbm = float(rx_match.group(1))
        except ValueError:
            continue
        metrics.setdefault(onu_id, {})["signal_dbm"] = signal_dbm
    return metrics


def _parse_descriptions_from_running_config(output: str) -> dict[str, str]:
    descriptions: dict[str, str] = {}
    current_pon: int | None = None
    for raw_line in _clean_telnet_text(output).splitlines():
        line = " ".join(raw_line.strip().split())
        if not line:
            continue
        pon_match = PON_CTX_RE.match(line)
        if pon_match:
            current_pon = int(pon_match.group(1))
            continue
        if line.lower() == "exit":
            current_pon = None
            continue
        if current_pon is None:
            continue
        desc_match = ONU_DESC_RE.match(line)
        if not desc_match:
            continue
        onu = int(desc_match.group(1))
        desc = desc_match.group(2).strip()
        if not desc:
            continue
        descriptions[f"EPON0/{current_pon}:{onu}"] = desc
    return descriptions


def _parse_vlans_from_running_config(output: str) -> dict[str, str]:
    vlans: dict[str, str] = {}
    current_pon: int | None = None
    for raw_line in _clean_telnet_text(output).splitlines():
        line = " ".join(raw_line.strip().split())
        if not line:
            continue
        pon_match = PON_CTX_RE.match(line)
        if pon_match:
            current_pon = int(pon_match.group(1))
            continue
        if line.lower() == "exit":
            current_pon = None
            continue
        if current_pon is None:
            continue
        vlan_line_match = ONU_VLAN_RE.match(line)
        if not vlan_line_match:
            continue
        onu = int(vlan_line_match.group(1))
        cvlan_match = re.search(r"\bcvlan\s+(\d+)\b", line, flags=re.IGNORECASE)
        vlan_match = re.search(r"\bvlan\s+(\d+)\b", line, flags=re.IGNORECASE)
        vlan = cvlan_match.group(1) if cvlan_match else (vlan_match.group(1) if vlan_match else None)
        if vlan:
            vlans[f"EPON0/{current_pon}:{onu}"] = vlan
    return vlans


def _parse_auth_info_table(output: str) -> dict[str, dict[str, object]]:
    fields: dict[str, dict[str, object]] = {}
    for raw_line in _clean_telnet_text(output).splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if not ONU_ID_RE.match(line):
            continue
        parts = re.split(r"\s{2,}", line)
        if len(parts) < 6:
            continue
        onu_id = _normalize_onu_id(parts[0])
        status_raw = parts[2].strip().lower()
        if status_raw == "online":
            status = "Online"
        elif status_raw == "offline":
            status = "Offline"
        else:
            status = status_raw.title() if status_raw else "N/A"
        description_raw = parts[5].strip()
        description = None if description_raw.upper() in {"", "N/A", ":"} else description_raw
        payload = fields.setdefault(onu_id, {})
        payload["status"] = status
        payload["description"] = description
    return fields


class OltTelnetClient:
    def __init__(self, host: str, port: int, timeout: float = DEFAULT_TIMEOUT):
        self.host = host
        self.port = port
        self.timeout = timeout
        self._socket: socket.socket | None = None

    def connect(self) -> None:
        self._socket = socket.create_connection((self.host, self.port), timeout=self.timeout)
        self._socket.settimeout(self.timeout)

    def close(self) -> None:
        if self._socket:
            try:
                # Try graceful logout to avoid piling stale sessions on OLT.
                try:
                    self._socket.sendall(b"end\r\n")
                    self._socket.sendall(b"exit\r\n")
                    self._socket.sendall(b"exit\r\n")
                except OSError:
                    pass
                self._socket.close()
            finally:
                self._socket = None

    def _negotiate(self, chunk: bytes) -> str:
        assert self._socket is not None
        index = 0
        cleaned = bytearray()
        while index < len(chunk):
            byte = chunk[index]
            if byte == IAC and index + 2 < len(chunk):
                cmd = chunk[index + 1]
                opt = chunk[index + 2]
                if cmd in (DO, DONT):
                    self._socket.sendall(bytes([IAC, WONT, opt]))
                elif cmd in (WILL, WONT):
                    self._socket.sendall(bytes([IAC, DONT, opt]))
                index += 3
            else:
                cleaned.append(byte)
                index += 1
        return cleaned.decode(errors="ignore")

    def _read_for(self, seconds: float) -> str:
        assert self._socket is not None
        end = time.time() + seconds
        output: list[str] = []
        while time.time() < end:
            try:
                chunk = self._socket.recv(8192)
            except TimeoutError:
                time.sleep(0.05)
                continue
            except OSError:
                break
            if not chunk:
                break
            text = self._negotiate(chunk)
            if text:
                output.append(text)
                if "--More--" in text:
                    # Continue paginated output.
                    self._socket.sendall(b" ")
        return "".join(output)

    def _write_line(self, line: str) -> None:
        assert self._socket is not None
        self._socket.sendall((line + "\r\n").encode())

    def login(self, username: str, password: str) -> str:
        banner = self._read_for(1.0)
        self._write_line(username)
        _ = self._read_for(0.3)
        self._write_line(password)
        output = banner + self._read_for(1.0)
        if _is_login_failed(output):
            raise ConnectionError("Telnet authentication failed or session limit reached")
        return output

    def enable(self, password: str | None) -> str:
        if not password:
            return ""
        self._write_line("enable")
        _ = self._read_for(0.3)
        self._write_line(password)
        return self._read_for(0.8)

    def run_command(self, command: str, seconds: float = 1.5) -> str:
        self._write_line(command)
        return self._read_for(seconds)


def collect_onu_metrics_via_telnet(olt: Olt) -> tuple[dict[str, dict[str, object]], str | None]:
    if not olt.username or not olt.password:
        return {}, "Telnet skipped: missing username/password"

    last_error: Exception | None = None
    for attempt in range(1, DEFAULT_RETRY_ATTEMPTS + 1):
        client = OltTelnetClient(host=olt.ip_address, port=DEFAULT_TELNET_PORT, timeout=DEFAULT_TIMEOUT)
        try:
            client.connect()
            client.login(olt.username, olt.password)
            if DEFAULT_ENABLE_WITH_LOGIN_PASSWORD:
                client.enable(olt.password)
            client.run_command("terminal length 0", seconds=0.8)
            client.run_command("configure terminal", seconds=0.8)
            status_output = client.run_command("show onu status all", seconds=6.0)
            if not status_output.strip():
                raise ConnectionError("Empty response from 'show onu status all'")
            opm_output = client.run_command("show onu opm-diag all", seconds=6.0)
            client.run_command("end", seconds=0.3)

            metrics: dict[str, dict[str, object]] = {}
            for onu_id, payload in _parse_status_table(status_output).items():
                metrics.setdefault(onu_id, {}).update(payload)
            for onu_id, payload in _parse_opm_table(opm_output).items():
                metrics.setdefault(onu_id, {}).update(payload)
            return metrics, None
        except Exception as exc:
            last_error = exc
            time.sleep(DEFAULT_RETRY_BACKOFF * attempt)
        finally:
            client.close()
    return {}, f"Telnet failed: {last_error}"


def collect_onu_descriptions_via_telnet(olt: Olt) -> tuple[dict[str, str], str | None]:
    if not olt.username or not olt.password:
        return {}, "Telnet skipped: missing username/password"

    last_error: Exception | None = None
    for attempt in range(1, DEFAULT_RETRY_ATTEMPTS + 1):
        client = OltTelnetClient(host=olt.ip_address, port=DEFAULT_TELNET_PORT, timeout=DEFAULT_TIMEOUT)
        try:
            client.connect()
            client.login(olt.username, olt.password)
            if DEFAULT_ENABLE_WITH_LOGIN_PASSWORD:
                client.enable(olt.password)
            client.run_command("terminal length 0", seconds=0.8)
            running_config = client.run_command("show running-config", seconds=8.0)
            if _has_cli_error(running_config):
                raise ConnectionError("unable to read running-config")
            if not running_config.strip():
                raise ConnectionError("Empty response from 'show running-config'")
            return _parse_descriptions_from_running_config(running_config), None
        except Exception as exc:
            last_error = exc
            time.sleep(DEFAULT_RETRY_BACKOFF * attempt)
        finally:
            client.close()
    return {}, f"Telnet failed: {last_error}"


def update_onu_description_via_telnet(olt: Olt, onu_id: str, description: str) -> str | None:
    if not olt.username or not olt.password:
        return "Telnet skipped: missing username/password"

    pon, onu = _parse_onu_id(onu_id)
    if pon is None or onu is None:
        return f"Invalid ONU ID format: {onu_id}"

    sanitized = " ".join(description.replace("\r", " ").replace("\n", " ").split())
    if not sanitized:
        return "Description cannot be empty"
    if len(sanitized) > 32:
        return "Description max length is 32 characters"

    last_error: Exception | None = None
    for attempt in range(1, DEFAULT_RETRY_ATTEMPTS + 1):
        client = OltTelnetClient(host=olt.ip_address, port=DEFAULT_TELNET_PORT, timeout=DEFAULT_TIMEOUT)
        try:
            client.connect()
            client.login(olt.username, olt.password)
            if DEFAULT_ENABLE_WITH_LOGIN_PASSWORD:
                client.enable(olt.password)
            client.run_command("configure terminal", seconds=0.8)
            iface_out = client.run_command(f"interface epon 0/{pon}", seconds=0.8)
            if _has_cli_error(iface_out):
                return f"Failed to enter PON interface {pon}"
            update_out = client.run_command(f"onu {onu} description {sanitized}", seconds=1.2)
            if _has_cli_error(update_out):
                return f"Failed to set description on {onu_id}"
            client.run_command("end", seconds=0.5)
            return None
        except Exception as exc:
            last_error = exc
            time.sleep(DEFAULT_RETRY_BACKOFF * attempt)
        finally:
            client.close()
    return f"Telnet failed: {last_error}"


def collect_onu_live_fields_via_telnet(olt: Olt) -> tuple[dict[str, dict[str, object]], str | None]:
    if not olt.username or not olt.password:
        return {}, "Telnet skipped: missing username/password"

    last_error: Exception | None = None
    for attempt in range(1, DEFAULT_RETRY_ATTEMPTS + 1):
        client = OltTelnetClient(host=olt.ip_address, port=DEFAULT_TELNET_PORT, timeout=DEFAULT_TIMEOUT)
        try:
            client.connect()
            client.login(olt.username, olt.password)
            if DEFAULT_ENABLE_WITH_LOGIN_PASSWORD:
                client.enable(olt.password)
            client.run_command("terminal length 0", seconds=0.8)
            client.run_command("configure terminal", seconds=0.8)
            auth_output = client.run_command("show onu auth-info all", seconds=6.0)
            if not auth_output.strip():
                raise ConnectionError("Empty response from 'show onu auth-info all'")
            if _has_cli_error(auth_output):
                raise ConnectionError("unable to read ONU auth-info")
            running_config = client.run_command("show running-config", seconds=8.0)
            if _has_cli_error(running_config):
                raise ConnectionError("unable to read running-config")
            client.run_command("end", seconds=0.5)

            fields = _parse_auth_info_table(auth_output)
            descriptions = _parse_descriptions_from_running_config(running_config)
            vlans = _parse_vlans_from_running_config(running_config)

            for onu_id, payload in fields.items():
                payload["description"] = descriptions.get(onu_id, payload.get("description"))
                payload["vlan"] = vlans.get(onu_id)
            for onu_id, description in descriptions.items():
                payload = fields.setdefault(onu_id, {})
                payload["description"] = description
                payload.setdefault("status", "N/A")
                payload.setdefault("vlan", vlans.get(onu_id))
            for onu_id, vlan in vlans.items():
                payload = fields.setdefault(onu_id, {})
                payload["vlan"] = vlan
                payload.setdefault("status", "N/A")
            if not fields:
                raise ConnectionError("No ONU rows parsed from auth-info/running-config")
            return fields, None
        except Exception as exc:
            last_error = exc
            time.sleep(DEFAULT_RETRY_BACKOFF * attempt)
        finally:
            client.close()
    return {}, f"Telnet failed: {last_error}"


def collect_onu_snapshot_via_telnet(
    olt: Olt,
) -> tuple[dict[str, dict[str, object]], dict[str, dict[str, object]], str | None]:
    if not olt.username or not olt.password:
        return {}, {}, "Telnet skipped: missing username/password"

    last_error: Exception | None = None
    for attempt in range(1, DEFAULT_RETRY_ATTEMPTS + 1):
        client = OltTelnetClient(host=olt.ip_address, port=DEFAULT_TELNET_PORT, timeout=DEFAULT_TIMEOUT)
        try:
            client.connect()
            client.login(olt.username, olt.password)
            if DEFAULT_ENABLE_WITH_LOGIN_PASSWORD:
                client.enable(olt.password)
            client.run_command("terminal length 0", seconds=0.8)
            client.run_command("configure terminal", seconds=0.8)

            status_output = client.run_command("show onu status all", seconds=6.0)
            if not status_output.strip() or _has_cli_error(status_output):
                raise ConnectionError("unable to read ONU status")

            opm_output = client.run_command("show onu opm-diag all", seconds=6.0)
            auth_output = client.run_command("show onu auth-info all", seconds=6.0)
            running_config = client.run_command("show running-config", seconds=8.0)
            client.run_command("end", seconds=0.5)

            metrics: dict[str, dict[str, object]] = {}
            for onu_id, payload in _parse_status_table(status_output).items():
                metrics.setdefault(onu_id, {}).update(payload)
            for onu_id, payload in _parse_opm_table(opm_output).items():
                metrics.setdefault(onu_id, {}).update(payload)

            live_fields: dict[str, dict[str, object]] = {}
            if auth_output.strip() and not _has_cli_error(auth_output):
                live_fields = _parse_auth_info_table(auth_output)
            descriptions: dict[str, str] = {}
            vlans: dict[str, str] = {}
            if running_config.strip() and not _has_cli_error(running_config):
                descriptions = _parse_descriptions_from_running_config(running_config)
                vlans = _parse_vlans_from_running_config(running_config)

            for onu_id, payload in live_fields.items():
                payload["description"] = descriptions.get(onu_id, payload.get("description"))
                payload["vlan"] = vlans.get(onu_id)
            for onu_id, description in descriptions.items():
                payload = live_fields.setdefault(onu_id, {})
                payload["description"] = description
                payload.setdefault("status", "N/A")
                payload.setdefault("vlan", vlans.get(onu_id))
            for onu_id, vlan in vlans.items():
                payload = live_fields.setdefault(onu_id, {})
                payload["vlan"] = vlan
                payload.setdefault("status", "N/A")

            return metrics, live_fields, None
        except Exception as exc:
            last_error = exc
            time.sleep(DEFAULT_RETRY_BACKOFF * attempt)
        finally:
            client.close()
    return {}, {}, f"Telnet failed: {last_error}"
