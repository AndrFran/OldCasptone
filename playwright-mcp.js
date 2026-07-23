#!/usr/bin/env node

/**
 * Playwright MCP Server
 * Integrates Playwright browser automation with Claude Code for real-time frontend testing
 */

import { Server } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium } from "playwright";

class PlaywrightMCPServer {
  constructor() {
    this.server = new Server({
      name: "playwright-mcp",
      version: "1.0.0",
    });

    this.browser = null;
    this.pages = new Map();
    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "launch_browser",
          description: "Launch a Playwright browser instance",
          inputSchema: {
            type: "object",
            properties: {
              headless: {
                type: "boolean",
                description: "Run in headless mode (default: true)",
              },
              browser_type: {
                type: "string",
                enum: ["chromium", "firefox", "webkit"],
                description: "Browser type to launch (default: chromium)",
              },
            },
          },
        },
        {
          name: "new_page",
          description: "Create a new browser page/tab",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "string",
                description: "Unique identifier for this page",
              },
            },
          },
        },
        {
          name: "goto",
          description: "Navigate to a URL",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "string",
                description: "Page identifier",
              },
              url: {
                type: "string",
                description: "URL to navigate to",
              },
              wait_until: {
                type: "string",
                enum: ["load", "domcontentloaded", "networkidle"],
                description: "Wait strategy (default: load)",
              },
            },
            required: ["page_id", "url"],
          },
        },
        {
          name: "click",
          description: "Click on an element",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "string",
                description: "Page identifier",
              },
              selector: {
                type: "string",
                description: "CSS selector or text to click",
              },
              button: {
                type: "string",
                enum: ["left", "right", "middle"],
                description: "Mouse button (default: left)",
              },
            },
            required: ["page_id", "selector"],
          },
        },
        {
          name: "fill",
          description: "Fill a text input",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "string",
                description: "Page identifier",
              },
              selector: {
                type: "string",
                description: "CSS selector of input element",
              },
              text: {
                type: "string",
                description: "Text to fill",
              },
            },
            required: ["page_id", "selector", "text"],
          },
        },
        {
          name: "get_text",
          description: "Get text content from an element",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "string",
                description: "Page identifier",
              },
              selector: {
                type: "string",
                description: "CSS selector",
              },
            },
            required: ["page_id", "selector"],
          },
        },
        {
          name: "wait_for_selector",
          description: "Wait for an element to appear",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "string",
                description: "Page identifier",
              },
              selector: {
                type: "string",
                description: "CSS selector to wait for",
              },
              timeout: {
                type: "number",
                description: "Timeout in ms (default: 30000)",
              },
            },
            required: ["page_id", "selector"],
          },
        },
        {
          name: "take_screenshot",
          description: "Take a screenshot of the page",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "string",
                description: "Page identifier",
              },
              path: {
                type: "string",
                description: "Path to save screenshot (optional)",
              },
            },
            required: ["page_id"],
          },
        },
        {
          name: "evaluate",
          description: "Execute JavaScript in the page context",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "string",
                description: "Page identifier",
              },
              script: {
                type: "string",
                description: "JavaScript code to execute",
              },
            },
            required: ["page_id", "script"],
          },
        },
        {
          name: "close_page",
          description: "Close a page",
          inputSchema: {
            type: "object",
            properties: {
              page_id: {
                type: "string",
                description: "Page identifier",
              },
            },
            required: ["page_id"],
          },
        },
        {
          name: "close_browser",
          description: "Close the browser",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const result = await this.handleTool(
          request.params.name,
          request.params.arguments
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async handleTool(name, args) {
    switch (name) {
      case "launch_browser":
        return await this.launchBrowser(args);
      case "new_page":
        return await this.newPage(args);
      case "goto":
        return await this.goto(args);
      case "click":
        return await this.click(args);
      case "fill":
        return await this.fill(args);
      case "get_text":
        return await this.getText(args);
      case "wait_for_selector":
        return await this.waitForSelector(args);
      case "take_screenshot":
        return await this.takeScreenshot(args);
      case "evaluate":
        return await this.evaluate(args);
      case "close_page":
        return await this.closePage(args);
      case "close_browser":
        return await this.closeBrowser(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async launchBrowser(args) {
    const headless = args.headless !== false;
    const browserType = args.browser_type || "chromium";

    if (this.browser) {
      await this.browser.close();
    }

    this.browser = await chromium.launch({ headless });
    return {
      success: true,
      message: `Browser (${browserType}) launched in ${headless ? "headless" : "headed"} mode`,
    };
  }

  async newPage(args) {
    if (!this.browser) {
      throw new Error("Browser not launched. Call launch_browser first.");
    }

    const pageId = args.page_id || `page_${Date.now()}`;
    const page = await this.browser.newPage();
    this.pages.set(pageId, page);

    return {
      success: true,
      page_id: pageId,
      message: `New page created: ${pageId}`,
    };
  }

  async goto(args) {
    const page = this.pages.get(args.page_id);
    if (!page) throw new Error(`Page not found: ${args.page_id}`);

    const waitUntil = args.wait_until || "load";
    await page.goto(args.url, { waitUntil });

    return {
      success: true,
      url: args.url,
      message: `Navigated to ${args.url}`,
    };
  }

  async click(args) {
    const page = this.pages.get(args.page_id);
    if (!page) throw new Error(`Page not found: ${args.page_id}`);

    const button = args.button || "left";
    await page.click(args.selector, { button });

    return {
      success: true,
      selector: args.selector,
      message: `Clicked: ${args.selector}`,
    };
  }

  async fill(args) {
    const page = this.pages.get(args.page_id);
    if (!page) throw new Error(`Page not found: ${args.page_id}`);

    await page.fill(args.selector, args.text);

    return {
      success: true,
      selector: args.selector,
      text: args.text,
      message: `Filled: ${args.selector}`,
    };
  }

  async getText(args) {
    const page = this.pages.get(args.page_id);
    if (!page) throw new Error(`Page not found: ${args.page_id}`);

    const text = await page.textContent(args.selector);

    return {
      success: true,
      selector: args.selector,
      text: text || "",
    };
  }

  async waitForSelector(args) {
    const page = this.pages.get(args.page_id);
    if (!page) throw new Error(`Page not found: ${args.page_id}`);

    const timeout = args.timeout || 30000;
    await page.waitForSelector(args.selector, { timeout });

    return {
      success: true,
      selector: args.selector,
      message: `Element found: ${args.selector}`,
    };
  }

  async takeScreenshot(args) {
    const page = this.pages.get(args.page_id);
    if (!page) throw new Error(`Page not found: ${args.page_id}`);

    const path = args.path || `screenshot_${Date.now()}.png`;
    await page.screenshot({ path });

    return {
      success: true,
      path: path,
      message: `Screenshot saved to ${path}`,
    };
  }

  async evaluate(args) {
    const page = this.pages.get(args.page_id);
    if (!page) throw new Error(`Page not found: ${args.page_id}`);

    const result = await page.evaluate((script) => {
      return eval(script);
    }, args.script);

    return {
      success: true,
      result: result,
    };
  }

  async closePage(args) {
    const page = this.pages.get(args.page_id);
    if (!page) throw new Error(`Page not found: ${args.page_id}`);

    await page.close();
    this.pages.delete(args.page_id);

    return {
      success: true,
      message: `Page closed: ${args.page_id}`,
    };
  }

  async closeBrowser(args) {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.pages.clear();
    }

    return {
      success: true,
      message: "Browser closed",
    };
  }

  async start() {
    const transport = new StdioClientTransport();
    await this.server.connect(transport);
    console.error("Playwright MCP Server started");
  }
}

const server = new PlaywrightMCPServer();
server.start().catch(console.error);
