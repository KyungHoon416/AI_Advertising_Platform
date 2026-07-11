# apps/api — Backend (FastAPI)

Internal AI Advertising Platform 백엔드. Clean Architecture(interface/application/domain/infrastructure) 기반.

## Phase 2 (완료) — Database & Seed
- SQLAlchemy 2.0(async) 모델 **35 테이블** (`app/infrastructure/db/models/`)
- Alembic 초기 마이그레이션 (`app/alembic/versions/`)
- 멱등 Seed (`app/seed/`): RBAC(역할3/권한18) · 카테고리 트리 · 광고상품4+규칙 · 스코어링 v1(가중치 합 100) · 벤치마크 · 샘플 광고주
- FastAPI 엔트리(`app/main.py`): `/health`, `/ready`, `/docs`

## 로컬 실행 (Docker Compose)
```bash
# 저장소 루트에서
docker compose -f infra/docker-compose.yml up --build
# → api: http://localhost:8000/docs  (마이그레이션+시드 자동 수행)
```

## 로컬 실행 (직접)
```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env                      # DB/Redis/Secrets 설정
alembic upgrade head                      # 스키마 적용
python -m app.seed.seed                   # 시드 데이터
uvicorn app.main:app --reload             # http://localhost:8000/docs
```

## 마이그레이션
```bash
# 모델 변경 후 새 리비전 생성
alembic revision --autogenerate -m "메시지"
alembic upgrade head
```
> `DATABASE_URL_SYNC`(psycopg) 로 마이그레이션, `DATABASE_URL`(asyncpg) 로 앱 구동.

## 폴더 구조
```
app/
  core/            config · database · security
  domain/          enums (+ 이후 scoring/recommendation 순수 로직)
  infrastructure/
    db/base.py     Base·Mixin·JSONType(JSONB variant)
    db/models/     35개 엔티티
  alembic/         마이그레이션 환경
  seed/            멱등 시드 (data.py = 데이터, seed.py = 실행)
  main.py          FastAPI 엔트리
```

## 검증 메모 (로컬)
스키마·마이그레이션·시드·엔트리는 SQLite(async)로 end-to-end 검증됨. 프로덕션은 PostgreSQL(+pgvector). 모델 타입은 `Optional[...]`로 작성되어 3.9~3.11 모두 호환.
