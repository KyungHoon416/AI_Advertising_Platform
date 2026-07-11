terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Configure a remote backend in production (S3 + DynamoDB lock).
  # backend "s3" {
  #   bucket         = "nolbal-tfstate"
  #   key            = "ai-ad-platform/terraform.tfstate"
  #   region         = "ap-northeast-2"
  #   dynamodb_table = "nolbal-tflock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
