# Infrastructure Provisioning Pipeline (Terraform)

```
lint ──┬── validate ──┐
       └── test ──────┴── plan (matrix: dev|staging|prod) ── deploy-dev ── deploy-staging ── deploy-prod
                                                              └── each gated by a GitHub Environment approval
```

| File | What it is |
| --- | --- |
| [.github/workflows/terraform.yml](.github/workflows/terraform.yml) | Main pipeline: CI → plan → deployment chain |
| [.github/workflows/terraform-deploy.yml](.github/workflows/terraform-deploy.yml) | Reusable `workflow_call` deploy job, one per environment |
| [terraform/](terraform/) | Root module, per-env tfvars, `terraform test` suite, tflint config |

## Stages

1. **Lint** — `terraform fmt -check` + `tflint` (recommended ruleset).
2. **Validate** — `terraform init -backend=false` + `terraform validate`.
3. **Test** — native `terraform test` (5 cases: naming, per-env fleet size, two rejected-input cases, inventory contents). No Go/Terratest toolchain.
4. **Plan** — matrix over `dev`/`staging`/`prod`. Uploads the plan as an artifact, writes it to the job summary, and comments it on the PR.
5. **Deploy** — dev → staging → prod, sequential. Each downloads the approved plan artifact and runs `terraform plan` again. **`terraform apply` is intentionally never called.**

## GitHub Actions features used

`push`/`pull_request`/`workflow_dispatch` triggers with path filters · `concurrency` (cancel stale CI, never cancel a deploy) · least-privilege `permissions` · `needs` job graph · build matrix · dependency caching · artifacts passed between jobs · `$GITHUB_STEP_SUMMARY` · `actions/github-script` PR comments · reusable workflow via `workflow_call` · **Environments with required reviewers** for manual approval.

## One-time repo setup

Settings → Environments → create `dev`, `staging`, `prod`, and add **required reviewers** to each (that is the manual approval gate; nothing in the YAML needs changing).

## Local dev

```bash
cd terraform && terraform init && terraform fmt -check -recursive && terraform test
```

## Note on the infrastructure itself

The module uses the `random` and `local` providers so the whole pipeline runs green with zero cloud credentials. Swap [terraform/main.tf](terraform/main.tf) for real `aws_*` resources plus OIDC auth and the workflow is unchanged.
