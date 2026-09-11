import asyncio

from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.auth import ROLE_NAMES, Role, User
from app.models.system_metadata import SystemMetadata


async def seed() -> None:
    async with SessionLocal() as session:
        roles: dict[str, Role] = {}
        for role_name in ROLE_NAMES:
            result = await session.execute(select(Role).where(Role.name == role_name))
            role = result.scalar_one_or_none()
            if role is None:
                role = Role(name=role_name)
                session.add(role)
                await session.flush()
            roles[role_name] = role

        username = settings.seed_admin_username
        password = settings.seed_admin_password
        if bool(username) != bool(password):
            raise RuntimeError(
                "SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD must be provided together"
            )
        if username and password:
            result = await session.execute(select(User).where(User.username == username))
            user = result.scalar_one_or_none()
            if user is None:
                session.add(
                    User(
                        username=username,
                        password_hash=hash_password(password),
                        role_id=roles["ADMIN"].id,
                        is_active=True,
                    )
                )
            elif user.role_id != roles["ADMIN"].id:
                raise RuntimeError("Configured seed admin username already has another role")

        result = await session.execute(
            select(SystemMetadata).where(SystemMetadata.key == "foundation_version")
        )
        item = result.scalar_one_or_none()
        if item is None:
            session.add(SystemMetadata(key="foundation_version", value="phase2a-v2"))
        else:
            item.value = "phase2a-v2"
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
