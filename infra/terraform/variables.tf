variable "project" {
  type    = string
  default = "nolbal-ai-ads"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "region" {
  type    = string
  default = "ap-northeast-2" # Seoul
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "db_name" {
  type    = string
  default = "ai_ad_platform"
}

variable "db_username" {
  type    = string
  default = "postgres"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.small"
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.small"
}

variable "api_image" {
  type        = string
  description = "Fully-qualified ECR image for the API (set after docker push)."
  default     = ""
}

variable "web_image" {
  type        = string
  description = "Fully-qualified ECR image for the Web (set after docker push)."
  default     = ""
}

variable "api_desired_count" {
  type    = number
  default = 2
}

variable "web_desired_count" {
  type    = number
  default = 2
}

# Sensitive values are created empty in Secrets Manager and populated out-of-band
# (console/CI), so they never live in Terraform state as plaintext inputs.
variable "gemini_api_key" {
  type      = string
  default   = ""
  sensitive = true
}
variable "anthropic_api_key" {
  type      = string
  default   = ""
  sensitive = true
}
