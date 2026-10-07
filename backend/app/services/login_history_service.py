import uuid
import re
from typing import Optional
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from app.models.login_event import LoginEvent

def truncate_ip(ip: Optional[str]) -> str:
    """
    Truncates IP address for privacy compliance:
    - IPv4: removes the last octet (e.g. 192.168.1.45 -> 192.168.1.*)
    - IPv6: retains only the /48 routing prefix (e.g. 2001:db8:85a3:8d3:: -> 2001:db8:85a3::/48)
    """
    if not ip or not ip.strip():
        return "127.0.0.*"
    
    clean_ip = ip.strip()

    # IPv4 detection
    ipv4_pattern = r"^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$"
    m4 = re.match(ipv4_pattern, clean_ip)
    if m4:
        return f"{m4.group(1)}.{m4.group(2)}.{m4.group(3)}.*"

    # IPv6 detection
    if ":" in clean_ip:
        if clean_ip == "::1":
            return "::1/48"
        # Split non-empty blocks
        blocks = [b for b in clean_ip.split(":") if b]
        if len(blocks) >= 3:
            return f"{blocks[0]}:{blocks[1]}:{blocks[2]}::/48"
        return f"{clean_ip}::/48"

    return "127.0.0.*"


def parse_browser_os(user_agent: Optional[str]) -> str:
    """
    Parses User-Agent into a clean human-readable 'Browser on OS' label.
    """
    if not user_agent or not user_agent.strip():
        return "Desktop Browser"

    ua = user_agent

    # 1. OS Detection
    os_name = "Unknown OS"
    if "Windows NT 10.0" in ua or "Windows NT 11.0" in ua or "Windows" in ua:
        os_name = "Windows"
    elif "iPhone" in ua:
        os_name = "iOS"
    elif "iPad" in ua:
        os_name = "iPadOS"
    elif "Macintosh" in ua or "Mac OS X" in ua:
        os_name = "macOS"
    elif "Android" in ua:
        os_name = "Android"
    elif "CrOS" in ua:
        os_name = "ChromeOS"
    elif "Linux" in ua:
        os_name = "Linux"

    # 2. Browser Detection
    browser_name = "Web Browser"
    if "Edg/" in ua:
        browser_name = "Edge"
    elif "OPR/" in ua or "Opera" in ua:
        browser_name = "Opera"
    elif "Chrome/" in ua and "Edg/" not in ua:
        browser_name = "Chrome"
    elif "Firefox/" in ua:
        browser_name = "Firefox"
    elif "Safari/" in ua or "iPhone" in ua or "iPad" in ua:
        browser_name = "Safari"
    elif "Playwright" in ua or "HeadlessChrome" in ua:
        browser_name = "Headless Chrome (Automated)"
    elif "python-httpx" in ua or "pytest" in ua:
        browser_name = "API Client"

    return f"{browser_name} on {os_name}"


async def record_login_event(
    db: AsyncSession,
    user_id: uuid.UUID | str,
    success: bool,
    method: str,
    request: Optional[Request] = None,
    ip_override: Optional[str] = None,
    ua_override: Optional[str] = None,
) -> LoginEvent:
    """
    Records a login event (password or demo-login, success or failure).
    Maintains a strict sliding window of the latest 100 entries per user.
    """
    # 1. Extract raw IP
    raw_ip = ip_override
    if not raw_ip and request:
        x_forwarded = request.headers.get("x-forwarded-for")
        if x_forwarded:
            raw_ip = x_forwarded.split(",")[0].strip()
        elif "x-real-ip" in request.headers:
            raw_ip = request.headers.get("x-real-ip")
        elif request.client:
            raw_ip = request.client.host

    # 2. Extract User-Agent
    ua = ua_override
    if not ua and request:
        ua = request.headers.get("user-agent", "")

    truncated_ip = truncate_ip(raw_ip)
    device_label = parse_browser_os(ua)

    # 3. Create LoginEvent record
    event = LoginEvent(
        user_id=user_id,
        success=success,
        method=method,
        browser_os=device_label,
        ip_address=truncated_ip,
    )
    db.add(event)
    await db.flush()

    # 4. Enforce strict latest 100 entries per user
    count_stmt = select(func.count(LoginEvent.id)).where(LoginEvent.user_id == user_id)
    total_count = (await db.execute(count_stmt)).scalar() or 0

    if total_count > 100:
        # Find IDs beyond the latest 100 (ordered by created_at DESC)
        overflow_stmt = (
            select(LoginEvent.id)
            .where(LoginEvent.user_id == user_id)
            .order_by(LoginEvent.created_at.desc())
            .offset(100)
        )
        overflow_ids = (await db.execute(overflow_stmt)).scalars().all()
        if overflow_ids:
            delete_stmt = delete(LoginEvent).where(LoginEvent.id.in_(overflow_ids))
            await db.execute(delete_stmt)
            await db.flush()

    return event
