"""Input guard: length, PII masking, normalization/hash for caching (docs/14 §8)."""

import hashlib
import re

MAX_CHARS = 1000

_PII = [
    (re.compile(r"\b(?:\+62|62|0)8\d{7,11}\b"), "[nomor HP]"),
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "[email]"),
    (re.compile(r"\b\d{16}\b"), "[NIK]"),
    (re.compile(r"\b\d{10}\b"), "[NISN]"),
    (re.compile(r"\b(?:jl|jalan)\.?\s+[^\n,.]{3,40}", re.IGNORECASE), "[alamat]"),
]
_BLOCKLIST = {"anjing lo", "bangsat", "kontol", "memek", "ngentot"}


def mask_pii(text: str) -> str:
    for pattern, repl in _PII:
        text = pattern.sub(repl, text)
    return text


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def text_hash(text: str) -> str:
    return hashlib.sha256(normalize(text).lower().encode()).hexdigest()


def has_blocked_words(text: str) -> bool:
    low = text.lower()
    return any(w in low for w in _BLOCKLIST)
