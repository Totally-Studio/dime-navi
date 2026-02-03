# Embedded Sidebar Mode - Documentation

This document explains how to use the embedded sidebar mode of DimeNotes to demonstrate the notebook integration on content websites.

## Overview

The embedded mode displays the DimeNotes application as a collapsible sidebar overlay that can be integrated with content websites. This prototype demonstrates how the notebook could work alongside your content pages.

## Access Methods

### 1. Local HTML Mode (⭐ RECOMMENDED - Works Best!)

```
http://localhost:5178/embedded?html=/YOUR_FILE.html
```

Use a local HTML file from your `/public` folder as the background. This is the **best option** for demos as it avoids all iframe restrictions!

**Example with your saved file:**
```
http://localhost:5178/embedded?html=/1.2%20Your%20business%20case%20-%20H2G%20Interactive%20Roadmap.html&url=https://dime-htg.uat.tclstaging.com/why-digital/1-2-your-business-case/
```

### 2. Local Image Mode (Alternative)

```
http://localhost:5178/embedded?image=/screenshot.png
```

Use a screenshot from your `/public` folder as the background.

**Example:**
```
http://localhost:5178/embedded?image=/digital-screen.png&url=https://dime-htg.uat.tclstaging.com/why-digital/1-2-your-business-case/
```

### 3. Remote Image Mode

```
http://localhost:5178/embedded?mode=image&remoteImage=YOUR_IMAGE_URL&url=TARGET_PAGE_URL
```

Use a screenshot or mockup image from a remote URL as the background.

**Example:**
```
http://localhost:5178/embedded?mode=image&remoteImage=https://i.imgur.com/example.png&url=https://dime-htg.uat.tclstaging.com/why-digital/1-2-your-business-case/
```

### 4. Default Embedded Mode (iframe - may not work due to X-Frame-Options)

```
http://localhost:5178/embedded
```

or

```
http://localhost:5178/#/embedded
```

This attempts to load the target website in an iframe. If the website blocks iframe embedding (due to X-Frame-Options), it will show a helpful error message instead.

### 5. With Custom URL

```
http://localhost:5178/embedded?url=https://example.com
```

Specify any target URL to attempt to display in the background iframe.

## Features

### Sidebar Panel
- **Width**: 450px on desktop, full-width on mobile
- **Position**: Fixed right side of viewport
- **Toggle**: Click the edge button to show/hide
- **Backdrop**: Semi-transparent overlay when sidebar is open

### Components in Sidebar

1. **Knowledge Sources Selector**
   - Collapsible section at the top
   - Shows count of selected sources
   - Click header to expand/collapse
   - Select/Deselect All button
   - Checkboxes for each knowledge source

2. **Chat Interface**
   - Header with "DiMe Notebook" title
   - New Chat button
   - Scrollable response area
   - Text input with send button
   - Shows selected resource count on send button

3. **All Core Features**
   - Authentication (Google sign-in)
   - Streaming responses
   - Conversation history
   - Save outputs
   - ELI5 mode
   - Citation references

## Styling

The embedded mode uses the Peacock Teal color scheme:
- **Header**: Dark peacock teal (#163d39)
- **Background**: Light peacock teal variations
- **Buttons**: Peacock teal accents
- **Animations**: Smooth slide-in/slide-out transitions

## Production Integration

In a production environment, this would be integrated directly into the website's HTML rather than using an iframe. The implementation would involve:

1. **Script Tag**: Add DimeNotes JavaScript bundle to the page
2. **Mount Point**: Create a container div for the sidebar
3. **Initialization**: Initialize the sidebar component with configuration
4. **Styling**: Include CSS for sidebar and responsive behavior

### Example Integration Code

```html
<!-- In the website's HTML -->
<div id="dime-notebook-sidebar"></div>
<script src="https://notebook.dime-htg.com/embed.js"></script>
<script>
  DimeNotebook.init({
    container: '#dime-notebook-sidebar',
    apiKey: 'YOUR_API_KEY',
    defaultOpen: false
  });
</script>
```

## Workarounds for X-Frame-Options

If you need to demo with the actual website content but it blocks iframes:

### Option 1: Use Screenshots (Recommended)
Take a full-page screenshot of the target website and use image mode:
```
?mode=image&image=PATH_TO_SCREENSHOT
```

### Option 2: Browser Extension
Create a simple browser extension that injects the sidebar code directly into the page.

### Option 3: Proxy Server
Set up a proxy server that removes X-Frame-Options headers (for development only).

### Option 4: Local Development
If you have access to the website's codebase, temporarily remove or modify the X-Frame-Options header for local testing.

## Responsive Behavior

- **Desktop** (> 768px): Sidebar is 450px wide, overlays from right side
- **Mobile** (≤ 768px): Sidebar is full-width when open
- **Toggle Button**: Follows sidebar position, always accessible

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support with responsive layout

## Known Limitations

1. **Iframe Restrictions**: Many websites block iframe embedding for security
2. **Cross-Origin**: Cannot interact with content inside the iframe
3. **Authentication**: Users must be logged in with Google to use the notebook
4. **Knowledge Base**: Requires backend API connection

## Future Enhancements

- Browser extension for direct page integration
- Bookmarklet for quick access
- More compact mobile layout options
- Theme customization per website
- Multiple sidebar positions (left, right, bottom)
