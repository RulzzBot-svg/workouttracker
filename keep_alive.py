"""
keep_alive.py – ping this Render service every 14 minutes to prevent the
free-tier instance from going to sleep.

Usage:
    python keep_alive.py https://your-app.onrender.com/api/health

Run this from a always-on machine or another service (e.g. a cron job,
a free UptimeRobot monitor, or another Render background worker).
"""
import sys
import time
import logging
import urllib.request

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(message)s")
log = logging.getLogger(__name__)

INTERVAL_SECONDS = 14 * 60  # 14 minutes – Render free tier sleeps after 15 minutes of inactivity


def ping(url: str) -> None:
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            log.info("Pinged %s → HTTP %s", url, resp.status)
    except Exception as exc:
        log.warning("Ping failed: %s", exc)


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    url = sys.argv[1]
    log.info("Keep-alive started. Pinging %s every %d seconds.", url, INTERVAL_SECONDS)
    while True:
        ping(url)
        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
