output "name_prefix" {
  description = "Prefix applied to every resource in this environment."
  value       = local.name_prefix
}

output "instance_count" {
  description = "Number of instances provisioned."
  value       = var.instance_count
}

output "instance_names" {
  description = "Generated instance names."
  value       = random_pet.instance[*].id
}

output "inventory_path" {
  description = "Path of the generated inventory file."
  value       = local_file.inventory.filename
}
