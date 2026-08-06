# ponytail: infrastructure is simulated with the random/local providers so the
# pipeline runs green with zero cloud credentials. Swap this file for real
# aws_* / azurerm_* resources + OIDC auth when a cloud account is available;
# nothing in the workflow changes.

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.tags,
  )
}

resource "random_pet" "instance" {
  count = var.instance_count

  prefix    = local.name_prefix
  length    = 2
  separator = "-"
}

resource "local_file" "inventory" {
  filename = "${path.module}/generated/${var.environment}-inventory.json"

  content = jsonencode({
    environment = var.environment
    prefix      = local.name_prefix
    tags        = local.tags
    instances   = random_pet.instance[*].id
  })
}
