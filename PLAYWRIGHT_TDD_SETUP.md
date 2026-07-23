# Playwright MCP + TDD Setup Guide

## What's Been Set Up

✅ **Playwright MCP Server** - Browser automation via Claude Code  
✅ **TDD Skill** - Test-driven development workflow  
✅ **MCP Configuration** - `.mcp.json` with playwright server  

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
cd frontend
npm install
```

This installs:
- `playwright` - Browser automation
- `@modelcontextprotocol/sdk` - MCP server support

### 2. Start Frontend Dev Server

```bash
cd frontend
npm run dev
```

The app will be running at `http://localhost:5173`

### 3. Use the TDD Skill

In Claude Code, invoke the skill:
```
/playwright-tdd
```

This loads the TDD testing guide and gives you access to Playwright tools.

## How It Works

### Playwright MCP Server
Located at `playwright-mcp.js`, this server provides 11 tools:

- `launch_browser()` - Start Chromium browser
- `new_page()` - Create a test page
- `goto()` - Navigate to URLs
- `click()` / `fill()` - Interact with elements
- `get_text()` - Read element content
- `wait_for_selector()` - Wait for dynamic content
- `take_screenshot()` - Visual debugging
- `evaluate()` - Run custom JavaScript
- `close_page()` / `close_browser()` - Cleanup

### TDD Workflow Example

```javascript
// 1. RED PHASE: Write failing test
→ launch_browser()
→ new_page('product-list')
→ goto('product-list', 'http://localhost:5173/')
→ wait_for_selector('product-list', '[data-testid="product-card"]')
❌ Element not found → Feature not implemented

// 2. GREEN PHASE: Implement feature
// Build ProductList component in React...

// 3. BLUE PHASE: Re-run test
→ wait_for_selector('product-list', '[data-testid="product-card"]')
✓ Element found → Test passes

// 4. REFACTOR: Improve code
// Extract components, optimize...
```

## Configuration Files

### .mcp.json
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

### playwright-tdd Skill
Located at `.claude/skills/playwright-tdd.md` - provides:
- Test patterns for each use case (UC1-UC4)
- Common assertion helpers
- Troubleshooting guide

## Testing Each Use Case

### UC1: Browse Products & Place Order
```javascript
// Test product listing
await goto('page1', 'http://localhost:5173/')
await wait_for_selector('page1', '[data-testid="product-card"]')

// Test add to cart
await click('page1', '[data-testid="add-to-cart"]')
await get_text('page1', '[data-testid="cart-count"]')
// Should see updated count
```

### UC2: Discounts & Coupon Codes
```javascript
await goto('checkout', 'http://localhost:5173/checkout')
await fill('checkout', '[data-testid="coupon-input"]', 'SAVE10')
await click('checkout', '[data-testid="apply-coupon"]')
// Verify discount applied in total
```

### UC3: Inventory Management
```javascript
await goto('ops', 'http://localhost:5173/dashboard/inventory')
await wait_for_selector('ops', '[data-testid="low-stock-alert"]')
// Verify alert badge shows
```

### UC4: Order Status Tracking
```javascript
await goto('orders', 'http://localhost:5173/orders')
await click('orders', '[data-testid="order-123"]')
// Verify order detail page loads
```

## Best Practices

### 1. Use `data-testid` Attributes
Add these to your React components for reliable selectors:
```jsx
<button data-testid="add-to-cart">Add to Cart</button>
```

### 2. One Assertion Per Test
✓ `wait_for_selector()` - Element exists  
✓ `get_text()` - Content is correct  
✓ `take_screenshot()` - Visual check  

Easier to debug when tests fail.

### 3. Wait for Dynamic Content
```javascript
// DON'T: Expect element immediately after action
await click('page', '[data-testid="load-more"]')
await get_text('page', '[data-testid="item-100"]')  // May fail!

// DO: Wait first
await click('page', '[data-testid="load-more"]')
await wait_for_selector('page', '[data-testid="item-100"]')
await get_text('page', '[data-testid="item-100"]')  // Safe
```

### 4. Take Screenshots on Failure
```javascript
// When things don't work as expected
await take_screenshot('page', '/tmp/failure-screenshot.png')
// Check the image to see what actually rendered
```

### 5. Use `goto(..., 'networkidle')` for API Calls
```javascript
// When loading data from backend
await goto('page', 'http://localhost:5173/products', 'networkidle')
// Waits for network requests to complete
```

## Troubleshooting

**"Element not found" timeout?**
- Check selector syntax (CSS selector rules)
- Verify element is not hidden (display: none, visibility: hidden)
- Use `take_screenshot()` to see actual page state

**"Browser not launched" error?**
- Call `launch_browser()` first
- Check Node.js version (16+ recommended)

**Playwright MCP not available?**
- Run `npm install` in frontend/
- Check `.mcp.json` exists in project root
- Restart Claude Code

**Port 5173 already in use?**
- Change Vite port: `npm run dev -- --port 5174`
- Or kill existing process: `lsof -i :5173`

## Next Steps

1. **Install dependencies**: `cd frontend && npm install`
2. **Start dev server**: `npm run dev`
3. **Invoke TDD skill**: Type `/playwright-tdd` in Claude Code
4. **Write first test**: Start with UC1 product listing
5. **Iterate**: Red → Green → Blue → Repeat

## Files Created

- `playwright-mcp.js` - MCP server implementation
- `.mcp.json` - MCP server registration
- `.claude/skills/playwright-tdd.md` - TDD workflow guide
- `frontend/package.json` - Added Playwright dependency

## Resources

- **Playwright Docs**: https://playwright.dev
- **MCP Spec**: https://modelcontextprotocol.io
- **React Testing**: https://react.dev/learn/writing-markup-with-jsx
- **Vibe Strike Spec**: See `CLAUDE.md` for project details
