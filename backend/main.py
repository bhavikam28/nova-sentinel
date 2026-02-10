"""
Nova Sentinel — FastAPI Application
AI-Powered Security Incident Response using Amazon Nova

Architecture:
- Framework: FastAPI + Strands Agents SDK + MCP Server
- Models: Nova 2 Lite, Nova Pro, Nova Micro, Nova 2 Sonic, Nova Canvas, Nova Act
- Protocol: Model Context Protocol (MCP) via FastMCP
- Orchestration: Strands Agents SDK with @tool decorators
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from api import analysis, demo, visual, remediation, voice, orchestration, storage, documentation, auth, mcp, nova_act
from utils.config import get_settings
from utils.logger import logger

# Initialize settings
settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.warning("=" * 70)
    logger.warning("NOVA SENTINEL — Starting Up")
    logger.warning("=" * 70)
    logger.warning("This application uses YOUR AWS account and credentials.")
    logger.warning("All AWS charges (Bedrock, DynamoDB, S3) will be billed to YOUR account.")
    logger.warning("Estimated cost: ~$2-5/month for light usage.")
    logger.warning("=" * 70)
    logger.info(f"AWS Profile: {settings.aws_profile}")
    logger.info(f"AWS Region: {settings.aws_region}")
    logger.info(f"Nova 2 Lite: {settings.nova_lite_model_id}")
    logger.info(f"Nova Pro: {settings.nova_pro_model_id}")
    logger.info(f"Nova Micro: {settings.nova_micro_model_id}")
    logger.info(f"Nova 2 Sonic: {settings.nova_sonic_model_id}")
    logger.info(f"Nova Canvas: {settings.nova_canvas_model_id}")
    logger.info("Frameworks: Strands Agents SDK (real) + MCP Server (FastMCP)")
    yield

# Create FastAPI app
app = FastAPI(
    title="Nova Sentinel",
    description="AI-Powered Security Incident Response using Amazon Nova — "
                "Strands Agents SDK + MCP Server + 6 Nova Models",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include REST API routers
app.include_router(analysis.router)
app.include_router(demo.router)
app.include_router(visual.router)
app.include_router(remediation.router)
app.include_router(voice.router)
app.include_router(orchestration.router)
app.include_router(storage.router)
app.include_router(documentation.router)
app.include_router(auth.router)
app.include_router(mcp.router)
app.include_router(nova_act.router)

# Mount MCP SSE endpoint for standard MCP clients
# This provides a standards-compliant MCP interface alongside our REST API
try:
    from mcp_server import mcp_server as mcp_srv
    app.mount("/mcp", mcp_srv.sse_app())
    logger.info("MCP SSE endpoint mounted at /mcp/")
except Exception as e:
    logger.warning(f"Could not mount MCP SSE endpoint: {e}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Nova Sentinel",
        "version": "2.0.0",
        "status": "running",
        "description": "AI-Powered Security Incident Response",
        "frameworks": {
            "strands": "strands-agents SDK (real)",
            "mcp": "MCP Server via FastMCP (real)",
            "nova_act": "nova-act SDK (real)",
        },
        "models": {
            "nova_2_lite": settings.nova_lite_model_id,
            "nova_pro": settings.nova_pro_model_id,
            "nova_micro": settings.nova_micro_model_id,
            "nova_2_sonic": settings.nova_sonic_model_id,
            "nova_canvas": settings.nova_canvas_model_id,
            "nova_act": "nova-act SDK (browser automation)",
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "region": settings.aws_region,
        "models": {
            "nova_2_lite": settings.nova_lite_model_id,
            "nova_pro": settings.nova_pro_model_id,
            "nova_micro": settings.nova_micro_model_id,
            "nova_2_sonic": settings.nova_sonic_model_id,
            "nova_canvas": settings.nova_canvas_model_id,
        },
        "frameworks": {
            "mcp": "MCP Server (FastMCP) — standards-compliant",
            "strands": "Strands Agents SDK — real @tool decorators",
            "nova_act": "Nova Act SDK — browser automation",
        }
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.debug else "An unexpected error occurred"
        }
    )


if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting Nova Sentinel on {settings.api_host}:{settings.api_port}")
    
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug
    )
