import { defineConfig, devices } from "@playwright/test";

// Chromium falls back to SwiftShader on a machine with no GPU, which is what a
// hosted runner gives us. SOFTWARE_WEBGL=1 forces the same driver locally.
const software = !!process.env.SOFTWARE_WEBGL;

export default defineConfig({
  testDir: "./tests",
  // Software rendering makes every action wait for a slower frame. The larger
  // budget is a margin, not a cure: the suite must still finish in ten minutes.
  timeout: process.env.CI ? 90000 : 45000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  // Software WebGL rendering competes for the hosted runner's CPU cores.
  workers: process.env.CI ? 1 : 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4174",
    channel: process.env.CI || software ? "chromium" : "chrome",
    launchOptions: software
      ? { args: ["--use-gl=angle", "--use-angle=swiftshader", "--disable-gpu"] }
      : {},
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
