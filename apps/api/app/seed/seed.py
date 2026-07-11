"""Idempotent database seeding for the Internal AI Advertising Platform.

Run:  python -m app.seed.seed
Requires the schema to be migrated first (alembic upgrade head).
"""
from __future__ import annotations

import asyncio
import os

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.domain.enums import (
    AdvertiserSource,
    AdvertiserStatus,
    CategoryLevel,
    ScoringVersionStatus,
)
from app.infrastructure.db.models import (
    AdProduct,
    AdProductCategoryRule,
    Advertiser,
    Benchmark,
    Category,
    Permission,
    Role,
    ScoreFactorDef,
    ScoringVersion,
    User,
)
from app.seed import data


async def _get_or_create(db: AsyncSession, model, defaults: dict | None = None, **keys):
    stmt = select(model).filter_by(**keys)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        return existing, False
    obj = model(**keys, **(defaults or {}))
    db.add(obj)
    await db.flush()
    return obj, True


async def seed_rbac(db: AsyncSession) -> None:
    perm_map: dict[tuple[str, str], Permission] = {}
    for resource, action in data.PERMISSIONS:
        perm, _ = await _get_or_create(
            db, Permission, defaults={"name": f"{resource}:{action}"},
            code=f"{resource}:{action}", resource=resource, action=action,
        )
        perm_map[(resource, action)] = perm

    for code, name, desc in data.ROLES:
        role, _ = await _get_or_create(db, Role, defaults={"name": name, "description": desc}, code=code)
        mapping = data.ROLE_PERMISSIONS[code]
        wanted = list(perm_map.values()) if mapping == "*" else [perm_map[k] for k in mapping]
        # load current to avoid duplicates
        await db.refresh(role, attribute_names=["permissions"])
        current = {p.code for p in role.permissions}
        for p in wanted:
            if p.code not in current:
                role.permissions.append(p)

    # default super admin
    admin_email = os.environ.get("SEED_ADMIN_EMAIL", "admin@nolbal.local")
    admin_pw = os.environ.get("SEED_ADMIN_PASSWORD", "ChangeMe!234")
    user, created = await _get_or_create(
        db, User,
        defaults={"password_hash": hash_password(admin_pw), "name": "Platform Admin", "is_active": True},
        email=admin_email,
    )
    if created:
        sa_role = (await db.execute(select(Role).filter_by(code="super_admin"))).scalar_one()
        await db.refresh(user, attribute_names=["roles"])
        user.roles.append(sa_role)


async def seed_categories(db: AsyncSession) -> dict[str, Category]:
    by_name: dict[str, Category] = {}
    for major, middles in data.CATEGORY_TREE.items():
        mj, _ = await _get_or_create(db, Category, defaults={"level": CategoryLevel.MAJOR}, name=major, parent_id=None)
        by_name[major] = mj
        for middle, minors in middles:
            md, _ = await _get_or_create(
                db, Category, defaults={"level": CategoryLevel.MIDDLE, "parent_id": mj.id}, name=middle,
            )
            by_name.setdefault(middle, md)
            for minor in minors:
                mn, _ = await _get_or_create(
                    db, Category, defaults={"level": CategoryLevel.MINOR, "parent_id": md.id}, name=minor,
                )
                by_name.setdefault(minor, mn)
    return by_name


async def seed_ad_products(db: AsyncSession) -> dict:
    prod_by_code = {}
    for p in data.AD_PRODUCTS:
        prod, _ = await _get_or_create(
            db, AdProduct,
            defaults={
                "name": p["name"], "definition": p["definition"],
                "features": p["features"], "fit_purposes": p["fit_purposes"],
                "base_price_band": p["base_price_band"],
            },
            code=p["code"],
        )
        prod_by_code[p["code"]] = prod
    for code, name, cond, factor, pts in data.AD_PRODUCT_RULES:
        await _get_or_create(
            db, AdProductCategoryRule,
            defaults={"condition": cond, "boost_factor": factor, "boost_points": pts},
            ad_product_id=prod_by_code[code].id, name=name,
        )
    return prod_by_code


async def seed_scoring(db: AsyncSession) -> None:
    version, created = await _get_or_create(
        db, ScoringVersion,
        defaults={"status": ScoringVersionStatus.ACTIVE, "note": "Seeded default weights"},
        version="v1",
    )
    if created:
        for target, code, label, maxs, weight in (data.ADVERTISER_FACTORS + data.AD_PRODUCT_FACTORS):
            db.add(ScoreFactorDef(
                scoring_version_id=version.id, target=target, factor_code=code,
                label=label, max_score=maxs, weight=weight,
            ))


async def seed_benchmarks(db: AsyncSession, cats: dict[str, Category]) -> None:
    rows = [
        ("워터파크", "splash", 3.2, 6.0, 9000, 45000, 260),
        ("워터파크", "category_ad", 2.8, 7.5, 6000, 45000, 300),
        ("리조트", "main_banner", 1.8, 4.0, 12000, 220000, 240),
        ("키즈카페", "category_ad", 3.5, 8.0, 5000, 30000, 320),
    ]
    from app.domain.enums import AdProductCode
    for cat_name, code, ctr, cvr, cpm, aov, roi in rows:
        cat = cats.get(cat_name)
        exists = (await db.execute(
            select(Benchmark).filter_by(category_id=cat.id if cat else None, ad_product_code=AdProductCode(code))
        )).scalar_one_or_none()
        if not exists:
            db.add(Benchmark(
                category_id=cat.id if cat else None, ad_product_code=AdProductCode(code),
                avg_ctr=ctr, avg_cvr=cvr, avg_cpm=cpm, avg_order_value=aov, industry_avg_roi=roi,
            ))


async def seed_advertisers(db: AsyncSession, cats: dict[str, Category]) -> None:
    for name, brand, cat_name, region, size, budget, source in data.SAMPLE_ADVERTISERS:
        cat = cats.get(cat_name)
        await _get_or_create(
            db, Advertiser,
            defaults={
                "brand": brand, "primary_category_id": cat.id if cat else None,
                "region": region, "size": size, "budget_band": budget,
                "source": AdvertiserSource(source),
                "status": AdvertiserStatus.CANDIDATE,
            },
            name=name,
        )


async def run() -> None:
    async with SessionLocal() as db:
        await seed_rbac(db)
        cats = await seed_categories(db)
        await seed_ad_products(db)
        await seed_scoring(db)
        await seed_benchmarks(db, cats)
        await seed_advertisers(db, cats)
        await db.commit()
    print("[seed] done")


if __name__ == "__main__":
    asyncio.run(run())
