# Playwright TDD Testing Skill

## Overview
Test Vibe Strike frontend in real-time using Playwright MCP server, enabling TDD workflows with live browser interaction.

## Prerequisites
- Playwright MCP server running
- Frontend dev server running on http://localhost:5173
- Browser context available via `playwright-mcp` MCP tool

## Workflow Pattern

### 1. Write Test (TDD Red Phase)
```javascript
// Define test requirements
- Navigate to feature URL
- Check that element exists
- Verify user interactions work
- Assert expected state changes
```

### 2. Run Test with Playwright MCP
```
playwright-mcp tool calls:
1. launch_browser() → Start browser
2. new_page() → Create test page
3. goto(page_id, url) → Navigate to feature
4. [Test interactions] → Click, fill, evaluate
5. Verify assertions
```

### 3. See Failure (Red Phase)
- Element not found → Feature not implemented
- Wrong state → Logic error
- Screenshot captured for debugging

### 4. Implement Feature (Green Phase)
- Build React component/feature
- Run tests again until green

### 5. Refactor (Blue Phase)
- Clean up implementation
- Rerun tests to verify

## Common TDD Test Patterns

### Test Product Listing (UC1)
```
✓ Navigate to /
✓ Wait for product list to load
✓ Verify product cards render
✓ Click product → goes to detail
```

### Test Add to Cart (UC1)
```
✓ Navigate to product detail
✓ Fill quantity input
✓ Click "Add to Cart"
✓ Verify cart count updates
```

### Test Coupon Code (UC2)
```
✓ Navigate to checkout
✓ Enter coupon code
✓ Verify discount applied
✓ Check total updated
```

### Test Inventory Alert (UC3)
```
✓ Navigate to ops dashboard
✓ Find low-stock item
✓ Verify alert badge shows
✓ Click restock button
```

### Test Order Tracking (UC4)
```
✓ Navigate to /orders
✓ See list of orders
✓ Click order → detail page
✓ Verify status updates in real-time
```

## Tool Reference

### Browser Lifecycle
- `launch_browser()` - Start browser (headless by default)
- `new_page()` - Create test page
- `close_page(page_id)` - Close page
- `close_browser()` - Stop browser

### Navigation & Waits
- `goto(page_id, url)` - Navigate to URL
- `wait_for_selector(page_id, selector)` - Wait for element

### Interaction
- `click(page_id, selector)` - Click element
- `fill(page_id, selector, text)` - Fill input
- `get_text(page_id, selector)` - Read text
- `evaluate(page_id, script)` - Run JS

### Debugging
- `take_screenshot(page_id, path)` - Save visual
- `evaluate()` - Check page state via console

## Example TDD Session

```javascript
// 1. RED: Write test for product listing
await launch_browser()
await new_page('products-test')
await goto('products-test', 'http://localhost:5173/')
await wait_for_selector('products-test', '[data-testid="product-card"]')
// FAIL: Element not found → Feature missing

// 2. GREEN: Implement product listing in React
// Build ProductList component...
// Rerun test → Element found ✓

// 3. BLUE: Refactor
// Extract to subcomponent, etc.
```

## Setup Steps

### 1. Install Playwright
```bash
cd frontend
npm install -D playwright @playwright/test
```

### 2. Start Frontend Dev Server
```bash
npm run dev
# Running at http://localhost:5173
```

### 3. Register MCP Server
Add to `.claude/settings.json`:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["playwright-mcp.js"]
    }
  }
}
```

### 4. Use Skill
When testing:
```
/playwright-tdd
```

## Assertion Helpers

Common patterns in TDD tests:
- `wait_for_selector()` - Assert element exists
- `get_text()` - Assert text content
- `evaluate()` - Run custom JS assertions
- `take_screenshot()` - Visual regression check

## Tips

1. **Use data-testid attributes** for reliable selectors
   ```jsx
   <button data-testid="add-to-cart">Add</button>
   ```

2. **Test from user perspective**, not implementation
   - Click visible buttons, fill visible inputs
   - Don't test internal state directly

3. **One assertion per test** (ideally)
   - Narrow down failures faster
   - Easier to debug

4. **Take screenshots on failure**
   - Visual feedback on what went wrong
   - Great for async issues

5. **Use realistic data**
   - Test with same data shapes as production
   - Catch edge cases early

## Common Issues

**Element not found timeout**
- Check selector is correct
- Verify element is visible (display, opacity)
- Add `wait_for_selector()` before interaction

**Async timing issues**
- Add `wait_for_selector()` for dynamic content
- Use `goto(..., 'networkidle')` for API calls
- Check Network tab in browser

**Session state issues**
- Start fresh page per test
- Use `close_page()` to isolate
- Seed database with test data
