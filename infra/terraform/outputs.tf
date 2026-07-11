output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "Internal ALB DNS (origin for CloudFront)."
}

output "cloudfront_domain" {
  value       = aws_cloudfront_distribution.main.domain_name
  description = "Public HTTPS entry point."
}

output "ecr_api_repo" {
  value = aws_ecr_repository.api.repository_url
}

output "ecr_web_repo" {
  value = aws_ecr_repository.web.repository_url
}

output "rds_endpoint" {
  value     = aws_db_instance.postgres.address
  sensitive = true
}

output "redis_endpoint" {
  value     = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive = true
}

output "assets_bucket" {
  value = aws_s3_bucket.assets.bucket
}
