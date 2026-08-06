# Native `terraform test` — no Terratest/Go toolchain needed.
# Run locally with:  terraform init && terraform test

variables {
  environment = "dev"
}

run "names_are_prefixed_per_environment" {
  command = plan

  assert {
    condition     = output.name_prefix == "cpastone-dev"
    error_message = "Expected prefix 'cpastone-dev', got '${output.name_prefix}'."
  }
}

run "each_environment_gets_its_own_fleet_size" {
  command = plan

  variables {
    environment    = "prod"
    instance_count = 3
  }

  assert {
    condition     = output.instance_count == 3
    error_message = "prod should provision 3 instances."
  }
}

run "unknown_environment_is_rejected" {
  command = plan

  variables {
    environment = "qa"
  }

  expect_failures = [var.environment]
}

run "oversized_fleet_is_rejected" {
  command = plan

  variables {
    instance_count = 99
  }

  expect_failures = [var.instance_count]
}

run "inventory_lists_every_instance_and_is_tagged" {
  command = apply

  variables {
    instance_count = 2
  }

  assert {
    condition     = length(jsondecode(local_file.inventory.content).instances) == 2
    error_message = "Inventory must contain one entry per instance."
  }

  assert {
    condition     = jsondecode(local_file.inventory.content).tags["ManagedBy"] == "terraform"
    error_message = "Default tags must be merged into every resource."
  }
}
