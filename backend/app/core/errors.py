class ApplicationConflict(Exception):
    """Safe application-level conflict mapped to HTTP 409 by the API layer."""

    def __init__(
        self,
        message: str = "Request conflicts with current state",
        *,
        code: str = "conflict",
    ) -> None:
        super().__init__(message)
        self.public_message = message
        self.code = code
