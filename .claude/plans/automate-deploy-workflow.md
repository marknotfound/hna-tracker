# Plan: Automate Deploy Workflow After Scrape Workflow

## Problem Analysis

The deploy workflow is configured to trigger on push to main (lines 5-7 in `deploy.yml`):
```yaml
on:
  push:
    branches:
      - main
```

However, when the scrape workflow commits and pushes to main (line 53 in `scrape.yml`), it uses the default `GITHUB_TOKEN`. **GitHub Actions has a security feature that prevents workflows triggered by GITHUB_TOKEN from triggering other workflows** to avoid recursive workflow execution.

This is why the deploy workflow doesn't automatically trigger after the scrape workflow commits.

## Solution: Use `workflow_run` Trigger

The recommended approach is to modify the deploy workflow to use the `workflow_run` trigger, which is specifically designed to chain workflows together.

### Changes Required

**File: `.github/workflows/deploy.yml`**

Change the trigger from:
```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:
```

To:
```yaml
on:
  # Trigger when scrape workflow completes
  workflow_run:
    workflows: ["Daily Standings Scrape"]
    types:
      - completed
    branches:
      - main

  # Allow manual deployment
  workflow_dispatch:
```

### How This Works

1. The `workflow_run` trigger listens for the completion of the "Daily Standings Scrape" workflow
2. It only triggers when the scrape workflow runs on the main branch
3. It triggers after the workflow completes (regardless of success/failure)
4. We can optionally add a condition to only deploy on successful scrape runs

### Optional Enhancement: Only Deploy on Success

Add a condition to the build job to only deploy if scrape was successful:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    # Only run if the scrape workflow succeeded
    if: ${{ github.event.workflow_run.conclusion == 'success' }}

    steps:
      # ... rest of the steps
```

## Benefits

✅ **No token management**: Uses built-in GitHub Actions features
✅ **Secure**: Designed by GitHub for workflow chaining
✅ **Clean separation**: Workflows remain independent
✅ **Maintains manual trigger**: `workflow_dispatch` still works
✅ **Clear dependency**: Easy to understand the workflow chain

## Alternative Solutions Considered

1. **Personal Access Token (PAT)**: More complex, requires secret management
2. **GitHub App Token**: Requires creating and managing a GitHub App
3. **repository_dispatch**: More steps, less straightforward
4. **workflow_call**: Requires making deploy reusable, tighter coupling

## Implementation Steps

1. Update `.github/workflows/deploy.yml` with `workflow_run` trigger
2. Add optional success condition to build job
3. Test by manually triggering scrape workflow
4. Verify deploy workflow triggers automatically
5. Commit and push changes

## Testing Plan

1. Manually trigger the scrape workflow using workflow_dispatch
2. Monitor workflow runs to confirm deploy starts after scrape completes
3. Check GitHub Pages to verify deployment succeeded
4. Verify manual deployment still works via workflow_dispatch
