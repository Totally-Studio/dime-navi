# Branching Strategy

This repository maintains separate versions for development and production environments using git branches.

## Branch Structure

### `main` - Production
- **Environment:** navi-production-485916 (Production)
- **Config File:** `.env.client`
- **Deployment:** `npm run deploy:prod`
- **Firebase Hosting:** https://navi-production-485916.web.app
- **Purpose:** Stable, production-ready code serving live users

### `develop` - Development
- **Environment:** dimenotesv2 (Development/Testing)
- **Config File:** `.env.local`
- **Deployment:** `npm run deploy:dev`
- **Firebase Hosting:** https://dimenotesv2.web.app
- **Purpose:** Active development, testing new features, experimentation

## Workflow

### Development Flow
1. **Create feature branch from develop:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Develop and test:**
   ```bash
   npm run dev              # Test locally
   npm run build            # Build widget
   npm run deploy:dev       # Deploy to dimenotesv2
   ```

3. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

4. **Merge to develop:**
   ```bash
   git checkout develop
   git merge feature/your-feature-name
   git push origin develop
   ```

### Production Release
1. **Merge develop to main when ready:**
   ```bash
   git checkout main
   git pull origin main
   git merge develop
   git push origin main
   ```

2. **Deploy to production:**
   ```bash
   npm run deploy:prod      # Deploy to navi-production-485916
   ```

## Branch Characteristics

### Code Divergence
- **Allowed:** The `develop` and `main` branches can have different features
- **Development first:** New features are built in `develop` first
- **Selective merging:** Only stable, tested features are merged to `main`
- **Experimental features:** Can remain in `develop` indefinitely

### Environment Configuration

**Development (develop branch):**
- Uses `.env.local` for Firebase config
- Points to dimenotesv2 project
- More verbose logging enabled
- Hot reload for faster development

**Production (main branch):**
- Uses `.env.client` for Firebase config
- Points to navi-production-485916 project
- Optimized builds
- Production error handling

## Common Tasks

### Switch between environments locally
```bash
# Work on development
git checkout develop
npm run dev                # Uses .env.local

# Work on production
git checkout main
npm run dev                # Uses .env.client (if testing prod config)
```

### Deploy specific version
```bash
# Deploy dev
git checkout develop
npm run deploy:dev

# Deploy prod
git checkout main
npm run deploy:prod
```

### Sync feature from develop to main
```bash
git checkout main
git cherry-pick <commit-hash>  # Pick specific commits
git push origin main
```

## Branch Protection

### Recommended GitHub settings:
- **main:** Require pull request reviews, status checks must pass
- **develop:** Direct commits allowed for rapid development

## Version Tracking

- Update `constants.ts` `WIDGET_VERSION` before production releases
- Use semantic versioning: `YYYY.MM.DD.patch`
- Tag production releases: `git tag -a v2026.02.03.1 -m "Release message"`

## Rollback Strategy

### If production has issues:
```bash
git checkout main
git revert <bad-commit-hash>
git push origin main
npm run deploy:prod
```

### Or revert to previous tag:
```bash
git checkout main
git reset --hard v2026.02.03.0  # Previous stable version
git push --force origin main    # Use with caution
npm run deploy:prod
```

## Notes

- Never force push to `main` unless emergency rollback
- Keep `develop` reasonably stable for testing
- Use feature branches for experimental work
- Document breaking changes in commit messages
- Test in dev before merging to main
