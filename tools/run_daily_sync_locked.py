#!/usr/bin/env python3
"""Hold the site's publish lock while running the complete Git sync workflow."""
from __future__ import annotations

import argparse
import importlib.util
import os
import subprocess
from pathlib import Path


def load_publisher():
    path = Path(__file__).with_name("publish_daily_updates.py")
    spec = importlib.util.spec_from_file_location("daily_publisher_lock", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site-root", required=True, type=Path)
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command
    if command and command[0] == "--":
        command = command[1:]
    if not command:
        parser.error("a command is required after --")
    if os.name == "nt":
        raise RuntimeError("daily Git sync lock wrapper requires POSIX")

    publisher = load_publisher()
    site_root = args.site_root.resolve()
    with publisher.site_lock(site_root) as lock_fd:
        env = os.environ.copy()
        env["DAILY_LOCK_ACTIVE"] = "1"
        env["DAILY_LOCK_FD"] = str(lock_fd)
        result = subprocess.run(command, cwd=site_root, env=env, pass_fds=(lock_fd,), check=False)
        return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
