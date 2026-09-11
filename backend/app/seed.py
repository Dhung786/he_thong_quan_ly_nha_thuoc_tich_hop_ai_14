import asyncio

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.system_metadata import SystemMetadata


async def seed() -> None:
    async with SessionLocal() as session:
        result = await session.execute(
            select(SystemMetadata).where(SystemMetadata.key == "foundation_version")
        )
        item = result.scalar_one_or_none()
        if item is None:
            session.add(SystemMetadata(key="foundation_version", value="phase2a-v1"))
            await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
