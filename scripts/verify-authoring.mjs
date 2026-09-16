import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

// Build a disposable copy: validation never edits the real collection.
const source = process.cwd();
const fixture = await mkdtemp(path.join(tmpdir(), "roomkey-authoring-"));
const vite = path.join(source, "node_modules/vite/bin/vite.js");
let server;
let devServer;
let browser;
function build() {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [vite, "build", "--base", "/exhibition/"],
      { cwd: fixture },
    );
    let output = "";
    child.stdout.on("data", (data) => {
      output += data;
    });
    child.stderr.on("data", (data) => {
      output += data;
    });
    child.on("close", (code) => resolve({ code, output }));
  });
}
try {
  for (const file of [
    "_artworks",
    "_rooms",
    "assets",
    "src",
    "public",
    "index.html",
    "package.json",
    "vite.config.js",
  ]) {
    await cp(path.join(source, file), path.join(fixture, file), {
      recursive: true,
    });
  }
  await mkdir(path.join(fixture, "node_modules"));
  for (const dependency of await readdir(path.join(source, "node_modules"))) {
    const original = path.join(source, "node_modules", dependency);
    const destination = path.join(fixture, "node_modules", dependency);
    // Browser-served fonts must live inside the fixture's Vite filesystem root.
    // Reuse build tools without copying the entire dependency installation.
    if (dependency === "@fontsource") {
      await cp(original, destination, { recursive: true });
    } else {
      await symlink(original, destination, "dir");
    }
  }
  await writeFile(
    path.join(fixture, "_rooms/second-room.markdown"),
    "---\ntitle: Second Room\n---\n",
  );
  await writeFile(
    path.join(fixture, "_rooms/empty-room.markdown"),
    "---\ntitle: Empty Room\n---\n",
  );
  const authoredWork =
    "---\nimage: roomkey/bug.jpg\ntitle: Fixture Work\ncreated: 2026\nartist: Fixture Artist\nroom: Second Room\n---\nA source description with <script>window.injected = true</script> shown as text.";
  await writeFile(
    path.join(fixture, "_rooms/long-room.markdown"),
    "---\ntitle: Long Room\n---\n",
  );
  for (let i = 0; i < 20; i++) {
    await writeFile(
      path.join(fixture, `_artworks/long-work-${i}.md`),
      authoredWork
        .replace("room: Second Room", "room: Long Room")
        .replace("title: Fixture Work", `title: Long Work ${i}`),
    );
  }
  await writeFile(
    path.join(fixture, "_artworks/fixture-work.md"),
    authoredWork,
  );
  const result = await build();
  assert.equal(result.code, 0, result.output);
  assert.match(
    await readFile(path.join(fixture, "dist/rooms/second-room.html"), "utf8"),
    /gallery=second-room/,
  );
  assert.match(
    await readFile(path.join(fixture, "dist/THIRD-PARTY-LICENSES.txt"), "utf8"),
    /SIL OPEN FONT LICENSE/,
  );
  server = spawn(
    process.execPath,
    [
      vite,
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      "4175",
      "--strictPort",
      "--base",
      "/exhibition/",
    ],
    { cwd: fixture, stdio: "pipe" },
  );
  let serverOutput = "";
  server.stderr.on("data", (data) => {
    serverOutput += data;
  });
  let listening = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    assert.equal(server.exitCode, null, serverOutput);
    try {
      listening = (await fetch("http://127.0.0.1:4175/exhibition/")).ok;
    } catch {
      /* Wait for the live preview process. */
    }
    if (listening) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(listening, "Fixture server did not start");
  browser = await chromium.launch({
    channel: process.env.CI ? "chromium" : "chrome",
  });
  const page = await browser.newPage();
  const errors = [];
  const failedRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      failedRequests.push(`${response.status()} ${response.url()}`);
  });
  const ready = () =>
    page
      .locator("#gallery-loading")
      .waitFor({ state: "hidden", timeout: 30000 });
  await page.goto("http://127.0.0.1:4175/exhibition/?gallery=second-room");
  await ready();
  assert.equal(await page.locator("a-image.inspectable").count(), 1);
  await page.locator("#gallery-inspect").click();
  assert.equal(
    await page.locator("#detail-title").textContent(),
    "Fixture Work",
  );
  assert.match(
    await page.locator("#detail-description").textContent(),
    /<script>/,
  );
  assert.equal(await page.evaluate(() => window.injected), undefined);
  await page.keyboard.press("Escape");
  await page.selectOption("#gallery-room", "roomkey");
  await ready();
  assert.equal(await page.locator("a-image.inspectable").count(), 8);
  await page.selectOption("#gallery-room", "long-room");
  await ready();
  assert.equal(await page.locator("a-image.inspectable").count(), 20);
  for (let i = 0; i < 9; i++) await page.locator("#gallery-next").click();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  assert.equal(
    await page
      .locator("#gallery-camera")
      .evaluate((camera) => camera.object3D.position.z),
    -62,
  );
  await page.selectOption("#gallery-room", "empty-room");
  await page.getByText("A little space for what comes next.").waitFor();
  await page.selectOption("#gallery-room", "second-room");
  await ready();
  assert.equal(await page.locator("a-image.inspectable").count(), 1);
  for (const suffix of [".html", "/"]) {
    await page.goto(
      `http://127.0.0.1:4175/exhibition/rooms/second-room${suffix}`,
    );
    await ready();
    assert.equal(await page.locator("a-image.inspectable").count(), 1);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(failedRequests, []);
  const resources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((resource) => resource.name),
  );
  assert.ok(
    resources.every((url) =>
      url.startsWith("http://127.0.0.1:4175/exhibition/"),
    ),
    "A runtime dependency escaped the deployment subpath",
  );
  console.log(
    "PASS: subpath build, bundled licenses, room switching, empty rooms, a 20-work room, original collection, safe descriptions, legacy URLs, and self-hosted assets.",
  );
  await writeFile(
    path.join(fixture, "_artworks/fixture-work.md"),
    authoredWork.replace("room: Second Room", "room: Missing Room"),
  );
  const invalid = await build();
  assert.notEqual(invalid.code, 0);
  assert.match(invalid.output, /room must match a title in _rooms/);
  console.log(
    "PASS: invalid room references fail the build with an actionable message.",
  );
  await writeFile(
    path.join(fixture, "_artworks/fixture-work.md"),
    authoredWork,
  );
  devServer = spawn(
    process.execPath,
    [vite, "--host", "127.0.0.1", "--port", "4176", "--strictPort"],
    { cwd: fixture, stdio: "pipe" },
  );
  let devOutput = "";
  devServer.stderr.on("data", (data) => {
    devOutput += data;
  });
  let devListening = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    assert.equal(devServer.exitCode, null, devOutput);
    try {
      devListening = (await fetch("http://127.0.0.1:4176/")).ok;
    } catch {
      /* Wait for the live development server. */
    }
    if (devListening) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(devListening, "Development server did not start");
  await page.goto("http://127.0.0.1:4176/#work/fixture-work");
  await page
    .locator("#art-dialog")
    .getByRole("heading", { name: "Fixture Work", exact: true })
    .waitFor();
  await writeFile(
    path.join(fixture, "_artworks/fixture-work.md"),
    authoredWork.replace("title: Fixture Work", "title: Updated Work"),
  );
  await page
    .locator("#art-dialog")
    .getByRole("heading", { name: "Updated Work", exact: true })
    .waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Step inside the gallery" }).click();
  await ready();
  assert.equal(await page.locator("a-image.inspectable").count(), 20);
  assert.deepEqual(errors, []);
  assert.deepEqual(failedRequests, []);
  console.log(
    "PASS: development preview, live Markdown refresh, optimized images, and 3D startup.",
  );
} finally {
  await browser?.close();
  for (const process of [server, devServer]) {
    if (process && process.exitCode === null) {
      const closed = new Promise((resolve) => process.once("close", resolve));
      process.kill();
      await closed;
    }
  }
  await rm(fixture, { recursive: true, force: true });
}
