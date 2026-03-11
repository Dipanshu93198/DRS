from fastapi import APIRouter

from app.services.gov_feeds import aggregate_government_feeds, provider_requirements

router = APIRouter(prefix="/public/gov-feeds", tags=["government-feeds"])


@router.get("/status")
async def get_government_feed_status(limit: int = 20):
    data = await aggregate_government_feeds(limit=limit)
    return {
        "sources": data["sources"],
        "providers": data["providers"],
        "last_updated": data["last_updated"],
    }


@router.get("/aggregate")
async def get_government_feed_aggregate(limit: int = 30):
    return await aggregate_government_feeds(limit=limit)


@router.get("/providers")
async def get_government_providers():
    return {"providers": provider_requirements()}
