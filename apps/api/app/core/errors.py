from fastapi import HTTPException


class ApiError(HTTPException):
    """HTTP error rendered as {"error": {"code", "message"}} (see docs/09-API-SPEC.md §1)."""

    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(status_code=status_code, detail={"code": code, "message": message})
