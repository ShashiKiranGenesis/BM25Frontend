# Frontend Structure - Separated Files

The frontend has been refactored to separate HTML, CSS, and JavaScript into individual files for better maintainability and organization.

## File Structure

```
frontend/
├── app.py                      # Flask application (backend)
├── requirements.txt            # Python dependencies
├── README.md                   # Frontend documentation
├── .gitignore                  # Git ignore rules
├── STRUCTURE.md               # This file
├── templates/
│   └── index.html             # HTML template (clean, no inline styles/scripts)
└── static/
    ├── css/
    │   └── style.css          # All CSS styles
    └── js/
        └── main.js            # All JavaScript functionality
```

## Changes Made

### 1. **index.html** (templates/index.html)
- Removed all inline `<style>` tags
- Removed all inline `<script>` tags
- Added link to external CSS: `<link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">`
- Added link to external JS: `<script src="{{ url_for('static', filename='js/main.js') }}"></script>`
- Kept minimal inline script for initialization with Flask template data

### 2. **style.css** (static/css/style.css)
Contains all CSS styles including:
- Global styles and resets
- Header and card layouts
- Flash message styles
- Upload section styles
- Button styles
- Document list and filter panel styles
- Query input and loading spinner
- Answer and source chunk styles
- All responsive design rules

### 3. **main.js** (static/js/main.js)
Contains all JavaScript functionality:
- `initApp()` - Initialize application with backend URL and document metadata
- `setupEventListeners()` - Set up all event listeners
- `getCheckedFiles()` - Get selected documents
- `toggleDoc()` - Toggle document selection
- `selectAll()` - Select all documents
- `clearAll()` - Clear all selections
- `applyMetaFilter()` - Apply metadata filters
- `updateFilterSummary()` - Update filter summary text
- `askQuestion()` - Main Q&A function (calls backend API)
- `escapeHtml()` - Utility function for HTML escaping

## Benefits of Separation

### Maintainability
- Easier to find and edit specific styles or scripts
- Clear separation of concerns (structure, presentation, behavior)
- Reduced file size for index.html

### Performance
- CSS and JS files can be cached by browsers
- Faster page loads on subsequent visits
- Easier to minify and optimize for production

### Development
- Better IDE support and syntax highlighting
- Easier debugging with browser dev tools
- Multiple developers can work on different files simultaneously

### Scalability
- Easy to add more CSS or JS files as needed
- Can implement CSS preprocessors (SASS, LESS) easily
- Can add build tools (webpack, rollup) for bundling

## How It Works

1. **Flask renders the template** (`index.html`)
   - Passes backend API URL and document metadata
   - Generates HTML with Jinja2 template variables

2. **Browser loads CSS** (`style.css`)
   - Applies all styles to the page
   - Cached for future page loads

3. **Browser loads JavaScript** (`main.js`)
   - Defines all functions and event handlers
   - Waits for initialization

4. **Inline script initializes the app**
   - Passes Flask template data to JavaScript
   - Calls `initApp()` with backend URL and metadata
   - Sets up event listeners and initial state

## Usage

No changes needed to run the application. Simply start the Flask server:

```bash
python app.py
```

The application will work exactly as before, but with cleaner, more maintainable code.

## Future Enhancements

Possible improvements:
- Add CSS variables for theming
- Implement dark mode
- Add more interactive features
- Use a JavaScript framework (React, Vue) if needed
- Add TypeScript for type safety
- Implement CSS modules or styled-components
- Add unit tests for JavaScript functions
