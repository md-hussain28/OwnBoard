class OnboardError(Exception):
    """Base class for all application-raised errors."""

    status_code = 500

    def __init__(self, message: str = "Internal server error"):
        self.message = message
        super().__init__(message)


class NotFoundError(OnboardError):
    status_code = 404

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message)


class ValidationError(OnboardError):
    status_code = 422

    def __init__(self, message: str = "Validation failed"):
        super().__init__(message)
