from fastapi import FastAPI

app = FastAPI(
    title="Nexora Notification Service",
    version="1.0.0"
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "notification-service"
    }


@app.get("/ready")
def readiness_check():
    return {
        "status": "ready",
        "service": "notification-service"
    }