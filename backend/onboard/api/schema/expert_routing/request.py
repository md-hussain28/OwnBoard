from pydantic import BaseModel


class RouteToExpertRequest(BaseModel):
    file_path: str
