# WordPress Integration Guide for DiMe Notebook Widget

## Overview

The DiMe Notebook Widget is a JavaScript-based sidebar that can be easily integrated into any WordPress website. This guide explains how to add the widget to your WordPress site.

---

## Quick Start (5 Minutes)

### Method 1: Add to Theme (Recommended)

Add the following code to your WordPress theme's `header.php` or `footer.php` file (before `</body>`):

```html
<!-- DiMe Notebook Widget -->
<script src="https://dimenotesv2.web.app/widget/widget.js"></script>
<script>
  window.addEventListener('load', function() {
    if (window.DimeNotebookWidget) {
      window.DimeNotebookWidget.init({
        position: 'right',        // 'left' or 'right'
        defaultOpen: false,        // true to start expanded
        apiKey: 'YOUR_API_KEY'    // Contact DiMe for API key
      });
    }
  });
</script>
```

### Method 2: Use WordPress Custom HTML Block

1. Go to **Appearance** → **Customize** → **Additional CSS** or use a Custom HTML widget
2. Add the same script code above
3. Save changes

### Method 3: Use a Plugin (Simple Custom CSS and JS)

1. Install plugin: **Simple Custom CSS and JS**
2. Go to **Custom CSS & JS** → **Add Custom JS**
3. Paste the initialization code (without `<script>` tags)
4. Publish

---

## Detailed Configuration

### Widget Configuration Options

```javascript
window.DimeNotebookWidget.init({
  // Position of sidebar
  position: 'right',        // 'left' or 'right' (default: 'right')

  // Start open or collapsed
  defaultOpen: false,        // true/false (default: false)

  // Your API key from DiMe
  apiKey: 'your-api-key-here',

  // Optional: Custom container (advanced)
  container: '#my-custom-container'  // CSS selector or DOM element
});
```

### Configuration Examples

**Right sidebar, starts collapsed:**
```javascript
window.DimeNotebookWidget.init({
  position: 'right',
  defaultOpen: false
});
```

**Left sidebar, starts open:**
```javascript
window.DimeNotebookWidget.init({
  position: 'left',
  defaultOpen: true
});
```

---

## Conditional Loading

### Show Widget Only on Specific Pages

```javascript
window.addEventListener('load', function() {
  // Only load on specific pages
  const currentPath = window.location.pathname;

  if (currentPath.includes('/blog/') || currentPath.includes('/resources/')) {
    window.DimeNotebookWidget.init({
      position: 'right',
      defaultOpen: false
    });
  }
});
```

### Show Widget Based on User Role (Requires WordPress Plugin)

If you're building a custom plugin, you can conditionally load the widget:

```php
<?php
// In your theme's functions.php or custom plugin
function load_dime_notebook_widget() {
    // Only for logged-in users
    if (is_user_logged_in()) {
        ?>
        <script src="https://dimenotesv2.web.app/widget/widget.js"></script>
        <script>
          window.addEventListener('load', function() {
            window.DimeNotebookWidget.init({
              position: 'right',
              defaultOpen: false
            });
          });
        </script>
        <?php
    }
}
add_action('wp_footer', 'load_dime_notebook_widget');
?>
```

---

## WordPress Plugin Development (Advanced)

For a more integrated experience, you can create a custom WordPress plugin:

### Plugin Structure

```
dime-notebook-plugin/
├── dime-notebook.php          # Main plugin file
├── admin/
│   ├── settings.php           # Settings page
│   └── admin-styles.css       # Admin styles
├── includes/
│   └── widget-loader.php      # Widget loader
└── README.txt                 # Plugin documentation
```

### Basic Plugin Code (`dime-notebook.php`)

```php
<?php
/**
 * Plugin Name: DiMe Notebook Widget
 * Description: Integrates the DiMe Notebook AI assistant into your WordPress site
 * Version: 1.0.0
 * Author: Digital Medicine Society
 * License: GPL2
 */

if (!defined('ABSPATH')) exit; // Exit if accessed directly

class DimeNotebook_Plugin {

    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_footer', array($this, 'load_widget'));
    }

    public function add_admin_menu() {
        add_options_page(
            'DiMe Notebook Settings',
            'DiMe Notebook',
            'manage_options',
            'dime-notebook',
            array($this, 'settings_page')
        );
    }

    public function register_settings() {
        register_setting('dime_notebook_settings', 'dime_notebook_api_key');
        register_setting('dime_notebook_settings', 'dime_notebook_position');
        register_setting('dime_notebook_settings', 'dime_notebook_default_open');
        register_setting('dime_notebook_settings', 'dime_notebook_enabled');
    }

    public function settings_page() {
        ?>
        <div class="wrap">
            <h1>DiMe Notebook Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('dime_notebook_settings'); ?>
                <table class="form-table">
                    <tr>
                        <th>Enable Widget</th>
                        <td>
                            <input type="checkbox" name="dime_notebook_enabled" value="1"
                                <?php checked(get_option('dime_notebook_enabled'), 1); ?> />
                        </td>
                    </tr>
                    <tr>
                        <th>API Key</th>
                        <td>
                            <input type="text" name="dime_notebook_api_key"
                                value="<?php echo esc_attr(get_option('dime_notebook_api_key')); ?>"
                                class="regular-text" />
                        </td>
                    </tr>
                    <tr>
                        <th>Position</th>
                        <td>
                            <select name="dime_notebook_position">
                                <option value="right" <?php selected(get_option('dime_notebook_position'), 'right'); ?>>Right</option>
                                <option value="left" <?php selected(get_option('dime_notebook_position'), 'left'); ?>>Left</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>Default State</th>
                        <td>
                            <input type="checkbox" name="dime_notebook_default_open" value="1"
                                <?php checked(get_option('dime_notebook_default_open'), 1); ?> />
                            <label>Start expanded</label>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    public function load_widget() {
        if (!get_option('dime_notebook_enabled')) return;

        $api_key = get_option('dime_notebook_api_key');
        $position = get_option('dime_notebook_position', 'right');
        $default_open = get_option('dime_notebook_default_open') ? 'true' : 'false';
        ?>
        <script src="https://dimenotesv2.web.app/widget/widget.js"></script>
        <script>
          window.addEventListener('load', function() {
            if (window.DimeNotebookWidget) {
              window.DimeNotebookWidget.init({
                position: '<?php echo esc_js($position); ?>',
                defaultOpen: <?php echo $default_open; ?>,
                apiKey: '<?php echo esc_js($api_key); ?>'
              });
            }
          });
        </script>
        <?php
    }
}

new DimeNotebook_Plugin();
```

---

## Styling and Customization

### Custom CSS Overrides

You can customize the widget's appearance using CSS:

```css
/* Add to WordPress Customizer → Additional CSS */

/* Change sidebar width */
.sidebar-panel {
  width: 500px !important;
}

/* Change colors */
.sidebar-panel {
  background: linear-gradient(to bottom, #004d40, #00796b) !important;
}

/* Change toggle button color */
.sidebar-toggle {
  background-color: #00796b !important;
}

/* Change font */
.sidebar-chat-container {
  font-family: 'Arial', sans-serif !important;
}
```

---

## Troubleshooting

### Widget Not Appearing

1. **Check browser console** (F12) for JavaScript errors
2. **Verify script is loaded**: View page source and search for "dimenotesv2.web.app"
3. **Check for conflicts**: Temporarily disable other plugins
4. **Clear cache**: Clear WordPress and browser cache

### Authentication Issues

1. **Verify API key**: Check with DiMe that your API key is active
2. **Check CORS**: Open browser console and look for CORS errors
3. **Test in incognito**: Rule out browser extension conflicts

### Styling Conflicts

1. **Check z-index**: Widget uses `z-index: 999999`
2. **Check position conflicts**: Some themes may interfere with `position: fixed`
3. **Add CSS specificity**: Use `!important` in custom CSS if needed

### Performance Issues

1. **Lazy load**: Add `defer` or `async` to script tag
2. **Check page speed**: Use Google PageSpeed Insights
3. **Optimize images**: Ensure your WordPress site is optimized

---

## Best Practices

### 1. Load Widget Asynchronously

```html
<script src="https://dimenotesv2.web.app/widget/widget.js" async></script>
<script>
  window.addEventListener('load', function() {
    // Wait for widget script to load
    const checkWidget = setInterval(function() {
      if (window.DimeNotebookWidget) {
        clearInterval(checkWidget);
        window.DimeNotebookWidget.init({
          position: 'right',
          defaultOpen: false
        });
      }
    }, 100);
  });
</script>
```

### 2. Graceful Degradation

```javascript
// Check if widget is available before initializing
if (typeof window.DimeNotebookWidget !== 'undefined') {
  window.DimeNotebookWidget.init({
    position: 'right'
  });
} else {
  console.log('DiMe Notebook widget not loaded');
}
```

### 3. Destroy Widget When Needed

```javascript
// Remove widget from page
if (window.DimeNotebookWidget) {
  window.DimeNotebookWidget.destroy();
}
```

---

## Mobile Considerations

The widget is fully responsive and adapts to mobile screens:

- **Desktop**: 450px sidebar
- **Tablet**: 450px sidebar with overlay
- **Mobile**: Full-screen sidebar when open

### Disable on Mobile (Optional)

```javascript
window.addEventListener('load', function() {
  // Only load on desktop (screen width > 768px)
  if (window.innerWidth > 768) {
    window.DimeNotebookWidget.init({
      position: 'right'
    });
  }
});
```

---

## Security Considerations

1. **API Key Protection**: Store API keys securely (WordPress options table)
2. **HTTPS Only**: Widget requires HTTPS for authentication
3. **Content Security Policy**: Ensure your CSP allows `dimenotesv2.web.app`
4. **User Permissions**: Consider restricting widget to logged-in users

---

## Support

For assistance with WordPress integration:

- **Email**: support@dimesociety.org
- **Documentation**: https://docs.dimesociety.org
- **GitHub Issues**: https://github.com/dimesociety/notebook/issues

---

## Version History

- **1.0.0** (2025-01-31): Initial release
  - Basic widget integration
  - Configuration options
  - WordPress plugin template

---

## License

The DiMe Notebook Widget is licensed under GPL2, compatible with WordPress.
