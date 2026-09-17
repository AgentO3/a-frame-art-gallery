import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  // Software WebGL rendering competes for the hosted runner's CPU cores.
  workers: process.env.CI ? 1 : 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4174",
    channel: process.env.CI ? "chromium" : "chrome",
    trace: {
      mode: "retain-on-failure",
      // Continuous and per-action screenshots stall software WebGL readback.
      // Keep DOM/network traces and the separate screenshot on failure.
      screenshots: !process.env.CI,
      snapshots: { dom: true, aria: true, screen: !process.env.CI },
    },
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run build && npm run preview -- --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
