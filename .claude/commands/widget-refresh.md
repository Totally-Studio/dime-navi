# Widget Refresh

Refresh, rebuild, and restart the DiMeNotes widget dev server.

## Steps

1. Kill any process on port 3000
2. Bump the WIDGET_VERSION build number in constants.ts
3. Clear Vite cache
4. Start the dev server

## Execute

Run the following command from the dimenotes directory:

```bash
cd "Z:/Application Prototypes/dimenotes" && npx kill-port 3000 && npm run dev:widget
```

Or use the batch script:

```bash
scripts/dev-refresh.bat
```
