#!/usr/bin/env python3
"""
Comprehensive secret detection script for pre-commit hooks.
Scans staged files for hardcoded secrets, API keys, passwords, tokens, etc.
"""

import re
import subprocess
import sys
import os
from pathlib import Path

# Fix Unicode encoding on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Patterns for detecting various types of secrets
SECRET_PATTERNS = {
    "api_key": r"(?i)(api[_-]?key|apikey)\s*[:=]\s*['\"]?[\w\-\.]+['\"]?",
    "password": r"(?i)(password|passwd|pwd)\s*[:=]\s*['\"][\w\-\.!@#$%^&*()]+['\"]",
    "bearer_token": r"(?i)(bearer|authorization)\s*[:=]\s*['\"]?[A-Za-z0-9\-._~+/]+=*['\"]?",
    "aws_key": r"(?i)(aws_?access_?key_?id|aws_?secret_?access_?key)\s*[:=]\s*['\"]?[A-Za-z0-9/+=]+['\"]?",
    "private_key": r"(-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY|-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY)",
    "certificate": r"-----BEGIN CERTIFICATE",
    "oauth_token": r"(?i)(oauth|access_?token|refresh_?token)\s*[:=]\s*['\"][\w\-\.]+['\"]",
    "github_token": r"(?i)(github_?token|gh_?token|pat_?token)\s*[:=]\s*['\"]?[a-zA-Z0-9_]+['\"]?",
    "slack_token": r"(?i)(slack_?token|slack_?webhook|xoxb|xoxp)\s*[:=]\s*['\"]?[A-Z0-9\-]+['\"]?",
    "database_url": r"(?i)(database_?url|db_?url|db_?password|db_?host)\s*[:=]\s*(?:postgres|mysql|mongodb)://",
    "firebase_key": r"(?i)(firebase|google_?application_?credentials)\s*[:=]\s*['\"][\w\-\.]+['\"]",
    "ssh_key": r"(?i)(ssh_?key|ssh_?private_?key|ssh_?identity)\s*[:=]\s*['\"]?[\w\-\.]+['\"]?",
    "jwt": r"(?i)(jwt|json_?web_?token)\s*[:=]\s*['\"]?eyJ[A-Za-z0-9_\-\.]+['\"]?",
    "client_secret": r"(?i)(client_?secret|client_?id)\s*[:=]\s*['\"][\w\-\.]+['\"]",
    "env_secrets": r"(?i)(secrets\s*:|secret_?key)\s*[:=]\s*['\"][\w\-\.!@#$%^&*()]+['\"]",
    "hardcoded_ip": r"(?i)(ip_?addr|host|server)\s*[:=]\s*(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}",
    "stripe_key": r"(?i)(stripe_?key|stripe_?secret)\s*[:=]\s*['\"]?sk_(?:live|test)_[\w]+['\"]?",
    "twilio_key": r"(?i)(twilio_?auth|twilio_?token)\s*[:=]\s*['\"][\w\-\.]+['\"]",
    "generic_secret": r"(?i)(secret|token)\s*[:=]\s*['\"][\w\-\.!@#$%^&*()~+=/]{8,}['\"]",
}

# File patterns to skip (binaries, build artifacts, etc.)
SKIP_PATTERNS = {
    r".*\.(pyc|o|so|bin|exe|dll|class|jar|zip|tar|gz|git)$",
    r".*node_modules.*",
    r".*\.git/.*",
    r".*__pycache__.*",
    r".*\.venv.*",
    r".*\.env\.example$",  # .env.example is usually safe
    r".*CHANGELOG.*",
    r".*\.lock$",
}

def should_skip_file(filepath):
    """Check if file should be skipped based on patterns."""
    for pattern in SKIP_PATTERNS:
        if re.match(pattern, filepath):
            return True
    return False

def get_staged_files():
    """Get list of staged files from git."""
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip().split("\n") if result.stdout.strip() else []
    except subprocess.CalledProcessError as e:
        print(f"Error getting staged files: {e}", file=sys.stderr)
        return []

def is_text_file(filepath):
    """Check if file is likely text (not binary)."""
    try:
        with open(filepath, "rb") as f:
            chunk = f.read(512)
            if b"\x00" in chunk:
                return False
            return True
    except Exception:
        return False

def scan_file_for_secrets(filepath):
    """Scan a file for secrets and return list of matches."""
    matches = []

    if not Path(filepath).exists():
        return matches

    if not is_text_file(filepath):
        return matches

    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            for line_num, line in enumerate(f, 1):
                # Skip comments and common safe patterns
                if line.strip().startswith("#"):
                    continue
                if ".example" in filepath or ".sample" in filepath:
                    continue

                for secret_type, pattern in SECRET_PATTERNS.items():
                    if re.search(pattern, line):
                        # Avoid false positives from example values
                        if "example" not in line.lower() and "placeholder" not in line.lower():
                            matches.append({
                                "type": secret_type,
                                "line": line_num,
                                "content": line.strip()[:80],  # First 80 chars
                            })
    except Exception as e:
        print(f"Error scanning {filepath}: {e}", file=sys.stderr)

    return matches

def main():
    """Main entry point."""
    staged_files = get_staged_files()

    if not staged_files:
        return 0

    secrets_found = {}

    for filepath in staged_files:
        if not filepath or should_skip_file(filepath):
            continue

        matches = scan_file_for_secrets(filepath)
        if matches:
            secrets_found[filepath] = matches

    if secrets_found:
        print("\n" + "=" * 70)
        print("🔒 SECURITY ALERT: Potential secrets detected in staged files!")
        print("=" * 70 + "\n")

        for filepath, matches in secrets_found.items():
            print(f"📄 {filepath}")
            for match in matches:
                print(f"   Line {match['line']}: [{match['type'].upper()}]")
                print(f"   {match['content']}")
            print()

        print("=" * 70)
        print("⚠️  Do NOT commit files with secrets!")
        print("\nTo fix:")
        print("  1. Remove the secret from the file")
        print("  2. If already committed, rotate the secret immediately")
        print("  3. Use git reset to unstage: git reset HEAD <file>")
        print("  4. Try committing again after removing secrets")
        print("=" * 70 + "\n")

        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())
