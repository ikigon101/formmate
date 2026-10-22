

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from image_routes import router as image_router

app = FastAPI(title="FormMate API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(image_router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "project": "FormMate"
    }
