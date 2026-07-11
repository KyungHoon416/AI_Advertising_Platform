# --- Secrets Manager (ADR-005: API keys & DB creds never in plaintext config) ---

resource "random_password" "db" {
  length  = 24
  special = false
}

resource "random_password" "jwt" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "db" {
  name = "${local.name}/db"
}
resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db.result
    dbname   = var.db_name
  })
}

# Full connection strings (built from RDS endpoint + generated password) so the
# app receives them as a single injected secret — ECS can't interpolate a secret
# into the middle of a plain env var.
resource "aws_secretsmanager_secret" "database_url" {
  name = "${local.name}/database-url"
}
resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql+asyncpg://${var.db_username}:${random_password.db.result}@${aws_db_instance.postgres.address}:5432/${var.db_name}"
}

resource "aws_secretsmanager_secret" "database_url_sync" {
  name = "${local.name}/database-url-sync"
}
resource "aws_secretsmanager_secret_version" "database_url_sync" {
  secret_id     = aws_secretsmanager_secret.database_url_sync.id
  secret_string = "postgresql+psycopg://${var.db_username}:${random_password.db.result}@${aws_db_instance.postgres.address}:5432/${var.db_name}"
}

resource "aws_secretsmanager_secret" "jwt" {
  name = "${local.name}/jwt-secret"
}
resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id     = aws_secretsmanager_secret.jwt.id
  secret_string = random_password.jwt.result
}

# LLM keys: created here, value populated out-of-band (CI/console) unless supplied.
resource "aws_secretsmanager_secret" "gemini" {
  name = "${local.name}/gemini-api-key"
}
resource "aws_secretsmanager_secret_version" "gemini" {
  count         = var.gemini_api_key == "" ? 0 : 1
  secret_id     = aws_secretsmanager_secret.gemini.id
  secret_string = var.gemini_api_key
}

resource "aws_secretsmanager_secret" "anthropic" {
  name = "${local.name}/anthropic-api-key"
}
resource "aws_secretsmanager_secret_version" "anthropic" {
  count         = var.anthropic_api_key == "" ? 0 : 1
  secret_id     = aws_secretsmanager_secret.anthropic.id
  secret_string = var.anthropic_api_key
}
