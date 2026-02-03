# DiMe Notebook WordPress Widget

## 📦 What Was Built

A standalone JavaScript widget version of the DiMe Notebook that can be embedded into any WordPress website (or any website) without requiring the full application.

## 🎯 Key Features

- **Standalone Widget**: Self-contained sidebar that overlays on any webpage
- **No iframe Required**: Injects directly into the page DOM
- **Fully Responsive**: Works on desktop, tablet, and mobile
- **Easy Integration**: Simple `<script>` tag integration
- **Configurable**: Position (left/right), default state (open/closed)
- **CORS Enabled**: Can be loaded from any domain

## 📁 Files Created

### Core Widget Files
- **`widget.tsx`** - Widget entry point with global API
- **`WidgetApp.tsx`** - Main widget application (without background iframe)
- **`components/WidgetContainer.tsx`** - Sidebar container with toggle button
- **`vite.config.widget.ts`** - Separate build configuration for widget

### Documentation
- **`docs/WORDPRESS_INTEGRATION.md`** - Comprehensive WordPress integration guide
- **`docs/WIDGET_README.md`** - This file
- **`public/widget-test.html`** - Test page for widget functionality

### Configuration
- **`firebase.json`** - Updated with CORS headers for widget files
- **`package.json`** - Added `build:widget` and `build:all` scripts

## 🚀 Build Commands

```bash
# Build only the widget
npm run build:widget

# Build both main app and widget
npm run build:all

# Build main app only
npm run build
```

## 📤 Build Output

Widget files are output to: `dist/widget/`

- **`widget.js`** - Bundled JavaScript (1.3MB, 340KB gzipped)
- **`widget.css`** - Bundled styles (17.6KB, 3KB gzipped)

## 🌐 Deployment

After building, the widget will be available at:
- **Production**: `https://dimenotesv2.web.app/widget/widget.js`
- **Local Test**: `http://localhost:5178/widget-test.html`

## 💻 WordPress Integration (Quick Start)

Add this code to your WordPress theme's `footer.php`:

```html
<script src="https://dimenotesv2.web.app/widget/widget.js"></script>
<script>
  window.addEventListener('load', function() {
    if (window.DimeNotebookWidget) {
      window.DimeNotebookWidget.init({
        position: 'right',        // 'left' or 'right'
        defaultOpen: false        // true to start expanded
      });
    }
  });
</script>
```

## 🔧 Configuration Options

```javascript
window.DimeNotebookWidget.init({
  position: 'right',              // 'left' | 'right' (default: 'right')
  defaultOpen: false,             // boolean (default: false)
  apiKey: 'your-api-key',        // optional API key
  container: '#custom-element'   // optional custom container
});
```

## 🎛️ API Methods

```javascript
// Initialize widget
window.DimeNotebookWidget.init(config);

// Destroy widget (remove from page)
window.DimeNotebookWidget.destroy();
```

## 🧪 Testing

1. **Build the widget**:
   ```bash
   npm run build:widget
   ```

2. **Copy to dist** (if testing locally):
   ```bash
   cp -r dist/widget dist/
   ```

3. **Start local server**:
   ```bash
   npm run dev
   ```

4. **Visit test page**:
   ```
   http://localhost:5178/widget-test.html
   ```

## 🚢 Deployment Steps

1. **Build everything**:
   ```bash
   npm run build:all
   ```

2. **Copy widget files to main dist**:
   ```bash
   # The widget files need to be in dist/ for Firebase hosting
   cp -r dist/widget/* dist/
   ```

3. **Deploy to Firebase**:
   ```bash
   firebase deploy --only hosting
   ```

4. **Verify deployment**:
   - Widget script: https://dimenotesv2.web.app/widget.js
   - Widget styles: https://dimenotesv2.web.app/widget.css
   - Test page: https://dimenotesv2.web.app/widget-test.html

## 🔐 Security & CORS

The Firebase hosting is configured to allow cross-origin requests:

```json
{
  "headers": [
    {
      "source": "widget.js",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

## 📱 Mobile Behavior

- **Desktop (> 768px)**: 450px sidebar with toggle
- **Mobile (≤ 768px)**: Full-width sidebar when open
- **Toggle button**: Always accessible on both sizes

## 🎨 Customization

WordPress sites can override styles using Custom CSS:

```css
/* Change sidebar width */
.sidebar-panel {
  width: 500px !important;
}

/* Change colors */
.sidebar-toggle {
  background-color: #00796b !important;
}
```

## ⚠️ Known Limitations

1. **Bundle Size**: ~1.3MB (340KB gzipped) - includes React, Firebase, and all dependencies
2. **Authentication**: Requires Firebase authentication (Google sign-in)
3. **API Key**: Currently requires API configuration (not implemented yet)

## 🔮 Future Enhancements

- [ ] Reduce bundle size (code splitting, tree shaking)
- [ ] Add API key authentication system
- [ ] Create WordPress plugin with admin UI
- [ ] Add more position options (bottom, corners)
- [ ] Add animation/transition preferences
- [ ] Support for custom themes/colors
- [ ] Analytics integration
- [ ] A/B testing support

## 📚 Documentation

For detailed integration instructions, see:
- **[WordPress Integration Guide](./WORDPRESS_INTEGRATION.md)** - Complete guide with examples
- **[Embedded Mode Docs](./EMBEDDED_MODE.md)** - Original embedded mode documentation

## 🐛 Troubleshooting

**Widget doesn't appear:**
- Check browser console for errors
- Verify script URL is loading
- Check for JavaScript conflicts with other plugins

**Authentication issues:**
- Verify Firebase configuration
- Check CORS headers in browser network tab
- Test in incognito mode to rule out cache issues

**Styling conflicts:**
- Check z-index (widget uses 999999)
- Try adding `!important` to custom CSS
- Verify no position:fixed conflicts with theme

## 📞 Support

- **Documentation**: Full docs in `docs/WORDPRESS_INTEGRATION.md`
- **Test Page**: `public/widget-test.html`
- **Issues**: Report issues with detailed browser/WordPress version info

---

**Version**: 1.0.0
**Last Updated**: 2025-01-31
**Build Status**: ✅ Working
