import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.auth import ROLE_NAMES, Role, User
from app.models.system_metadata import SystemMetadata


async def _seed_user(
    session: AsyncSession,
    *,
    role: Role,
    username: str | None,
    password: str | None,
) -> None:
    if not username or not password:
        return

    user_result = await session.execute(select(User).where(User.username == username))
    user: User | None = user_result.scalar_one_or_none()
    if user is None:
        session.add(
            User(
                username=username,
                password_hash=hash_password(password),
                role_id=role.id,
                is_active=True,
            )
        )
        return

    if user.role_id != role.id:
        raise RuntimeError(
            f"Configured seed username '{username}' already has another role"
        )


async def seed() -> None:
    async with SessionLocal() as session:
        roles: dict[str, Role] = {}
        for role_name in ROLE_NAMES:
            role_result = await session.execute(select(Role).where(Role.name == role_name))
            role: Role | None = role_result.scalar_one_or_none()
            if role is None:
                role = Role(name=role_name)
                session.add(role)
                await session.flush()
            roles[role_name] = role

        await _seed_user(
            session,
            role=roles["MANAGER"],
            username=settings.seed_manager_username,
            password=settings.seed_manager_password,
        )
        await _seed_user(
            session,
            role=roles["PHARMACIST"],
            username=settings.seed_pharmacist_username,
            password=settings.seed_pharmacist_password,
        )
        await _seed_user(
            session,
            role=roles["CUSTOMER"],
            username=settings.seed_customer_username,
            password=settings.seed_customer_password,
        )

        metadata_result = await session.execute(
            select(SystemMetadata).where(SystemMetadata.key == "foundation_version")
        )
        metadata: SystemMetadata | None = metadata_result.scalar_one_or_none()
        if metadata is None:
            session.add(SystemMetadata(key="foundation_version", value="pharmacy-srs-v1"))
        else:
            metadata.value = "pharmacy-srs-v1"
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
