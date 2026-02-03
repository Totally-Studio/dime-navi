# Widget Deploy

Build and deploy the widget to Firebase Hosting (production).

## Steps

1. Bump WIDGET_VERSION in constants.ts
2. Build all (app + widget)
3. Deploy to Firebase Hosting

## Execute

```bash
cd "Z:/Application Prototypes/dimenotes" && npm run build:all && firebase deploy --only hosting
```

Or for staging:

```bash
npm run deploy:staging
```

## Verify

After deploy, check the version at:
https://dimenotesv2.web.app/widget/widget.js
