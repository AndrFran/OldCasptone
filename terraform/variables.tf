variable "project_name" {
  description = "Short name used as a prefix for every provisioned resource."
  type        = string
  default     = "cpastone"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,20}$", var.project_name))
    error_message = "project_name must be lowercase alphanumeric with dashes, 3-21 chars."
  }
}

variable "environment" {
  description = "Target environment."
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "instance_count" {
  description = "How many application instances to provision."
  type        = number
  default     = 1

  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 5
    error_message = "instance_count must be between 1 and 5."
  }
}

variable "tags" {
  description = "Extra tags merged on top of the default tag set."
  type        = map(string)
  default     = {}
}
