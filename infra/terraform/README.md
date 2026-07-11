# infra/terraform — AWS 배포 (IaC)

놀이의발견 Internal AI Advertising Platform의 AWS 프로덕션 인프라(Terraform).

## 구성 리소스
| 영역 | 리소스 |
|---|---|
| 네트워크 | VPC · 2AZ public/private 서브넷 · IGW · NAT · 라우트 |
| 컴퓨트 | ECS Fargate 클러스터 · api/web 서비스 · ALB(path 라우팅) |
| 데이터 | RDS PostgreSQL 16(Multi-AZ·암호화) · ElastiCache Redis(암호화) |
| 이미지 | ECR(api/web, scan-on-push, immutable) |
| 시크릿 | Secrets Manager(DB URL·JWT·Gemini·Anthropic) → ECS secrets 주입 |
| 스토리지/CDN | S3(assets/제안서 export, private·버전·암호화) · CloudFront(ALB origin) |
| 관측 | CloudWatch Logs · Container Insights |

## 보안 설계
- **PII/시크릿 경계(ADR-005)**: API 키·DB 자격증명은 Secrets Manager에만 존재. ECS task
  실행 역할이 `GetSecretValue`로 컨테이너 시작 시 주입 → 코드/state에 평문 없음.
- DB/Redis는 private 서브넷 + ECS SG에서만 접근. 외부 노출은 CloudFront→ALB(HTTPS)만.
- RDS `deletion_protection`, 전송/저장 암호화 기본 활성화.

## 배포 순서
```bash
cd infra/terraform
terraform init
terraform plan  -var="region=ap-northeast-2"
terraform apply

# 1) ECR 로그인 후 이미지 빌드·푸시 (repo URL은 output 참조)
#    docker build -t <ecr_api_repo>:<tag> ../../apps/api && docker push ...
#    docker build -t <ecr_web_repo>:<tag> ../../apps/web && docker push ...
# 2) 이미지 태그를 지정해 재적용
terraform apply -var="api_image=<...>:<tag>" -var="web_image=<...>:<tag>"

# 3) LLM 키를 Secrets Manager에 주입 (state 오염 없이)
aws secretsmanager put-secret-value --secret-id nolbal-ai-ads-prod/gemini-api-key --secret-string "<KEY>"
```

## 미검증 사항 (배포 시 확인)
- 로컬에 Terraform 미설치로 `validate`/`plan` 미실행 — HCL은 수작업 검토.
- 커스텀 도메인/ACM 인증서·443 리스너는 주석으로 표기(추가 필요).
- 최초 마이그레이션은 api 컨테이너 CMD(`alembic upgrade head && seed`)가 수행하나,
  프로덕션에서는 one-off ECS task 또는 CI 단계로 분리 권장.
- remote backend(S3+DynamoDB) 주석 처리됨 — 팀 사용 시 활성화.
