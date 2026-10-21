"""Shared paths and logging setup for the scripts in this folder."""

import logging
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OFFICIAL = ROOT / "official"
DATA = ROOT / "data"
LOGS = ROOT / "logs"

GROUPS = range(1, 11)  # the site publishes 10 question groups per category set


def setup_logging(name: str) -> logging.Logger:
    """Log to the console and to logs/<name>.log."""
    LOGS.mkdir(exist_ok=True)
    log = logging.getLogger(name)
    log.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%H:%M:%S")
    for handler in (logging.StreamHandler(sys.stdout), logging.FileHandler(LOGS / f"{name}.log", encoding="utf-8")):
        handler.setFormatter(fmt)
        log.addHandler(handler)
    return log
