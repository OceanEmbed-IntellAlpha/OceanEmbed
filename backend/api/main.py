from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import inference

app = FastAPI(
    title="Digital Ocean Twin API",
    description="Lightweight API serving OceanEmbed reconstruction models",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inference.router, prefix="/api/reconstruct", tags=["Reconstruction"])

@app.get("/health")
def health_check():
    return {"status": "healthy"}
