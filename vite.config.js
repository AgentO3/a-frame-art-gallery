import { defineConfig } from "vite";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";
let isBuild = false;
async function readRooms() {
  const rooms = [];
  for (const file of (await readdir("_rooms")).sort()) {
    if (!/\.(md|markdown)$/.test(file)) continue;
    const { data } = matter(await readFile(path.join("_rooms", file), "utf8"));
    const id = file.replace(/\.(md|markdown)$/, "");
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) ||
      typeof data.title !== "string" ||
      !data.title.trim()
    )
      throw new Error(
        `${file}: a room needs a title and a lowercase hyphenated filename`,
      );
    if (rooms.some((room) => room.title === data.title || room.id === id))
      throw new Error(`${file}: duplicate room title or identifier`);
    rooms.push({ id, title: data.title });
  }
  if (!rooms.length) throw new Error("Add at least one room to _rooms.");
  return rooms;
}

// Markdown remains the collection's source of truth. Images are optimized at build time.
export default defineConfig({
  base: process.env.BASE_PATH || "./",
  server: {
    watch: {
      ignored: [
        "**/artifacts/**",
        "**/test-results/**",
        "**/playwright-report/**",
      ],
    },
  },
  plugins: [
    {
      name: "gallery-collection",
      configResolved(config) {
        isBuild = config.command === "build";
      },
      async generateBundle() {
        for (const room of await readRooms()) {
          for (const suffix of [".html", "/index.html"]) {
            const href = `${suffix === ".html" ? "../" : "../../"}?gallery=${room.id}`;
            this.emitFile({
              type: "asset",
              fileName: `rooms/${room.id}${suffix}`,
              source: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=${href}"><title>Enter the gallery</title></head><body><a href="${href}">Enter the gallery</a></body></html>`,
            });
          }
        }
        const licenses = await Promise.all(
          [
            ["A-Frame 1.8.0", "assets/vendor/AFRAME-LICENSE"],
            ["Gallery surface materials (CC0)", "assets/materials/SOURCES.md"],
            ["Manrope", "node_modules/@fontsource/manrope/LICENSE"],
            [
              "Cormorant Garamond",
              "node_modules/@fontsource/cormorant-garamond/LICENSE",
            ],
          ].map(
            async ([name, file]) => `${name}\n${await readFile(file, "utf8")}`,
          ),
        );
        this.emitFile({
          type: "asset",
          fileName: "THIRD-PARTY-LICENSES.txt",
          source: licenses.join("\n\n---\n\n"),
        });
      },
      resolveId(id) {
        if (id === "virtual:collection") return "\0collection";
      },
      async load(id) {
        if (id !== "\0collection") return;
        const rooms = await readRooms();
        const artworks = [];
        for (const file of (await readdir("_artworks")).sort()) {
          if (!/\.md$/.test(file)) continue;
          this.addWatchFile(path.resolve("_artworks", file));
          const { data, content } = matter(
            await readFile(path.join("_artworks", file), "utf8"),
          );
          for (const key of ["title", "image", "artist", "room"]) {
            if (typeof data[key] !== "string" || !data[key].trim())
              throw new Error(`${file}: missing or invalid ${key}`);
          }
          if (!/^\d{4}$/.test(String(data.created)))
            throw new Error(`${file}: created must be a four-digit year`);
          if (!rooms.some((room) => room.title === data.room))
            throw new Error(`${file}: room must match a title in _rooms`);
          const slug = file.replace(/(?:\.jpg)?\.md$/, "");
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
            throw new Error(`${file}: use a lowercase, hyphenated filename`);
          if (artworks.some((art) => art.id === slug))
            throw new Error(`${file}: duplicate artwork slug`);
          const source = path.resolve("assets/artwork", data.image);
          if (!source.startsWith(path.resolve("assets/artwork") + path.sep))
            throw new Error("Invalid artwork path");
          this.addWatchFile(source);
          const pipeline = sharp(source).rotate();
          const metadata = await pipeline.metadata();
          const buffer = await pipeline
            .resize({ width: 1600, withoutEnlargement: true })
            .webp({ quality: 86 })
            .toBuffer();
          const asset = isBuild
            ? this.emitFile({
                type: "asset",
                name: `${file.replace(/\.md$/, "")}.webp`,
                source: buffer,
              })
            : null;
          artworks.push({
            ...data,
            id: slug,
            description: content.trim(),
            width: metadata.width,
            height: metadata.height,
            image: isBuild
              ? `__ASSET_${asset}__`
              : `/__artwork/${data.image.split("/").map(encodeURIComponent).join("/")}`,
          });
        }
        const preferred = [
          "crystal-city",
          "flaming-shore",
          "sherbert-land",
          "london-flowers",
          "a-private-swim",
          "bug",
          "goat-peak",
          "burger-n-shake",
        ];
        artworks.sort(
          (a, b) =>
            (preferred.indexOf(a.id) >>> 0) - (preferred.indexOf(b.id) >>> 0),
        );
        if (!artworks.length)
          throw new Error("Add at least one artwork to _artworks.");
        return `export const rooms = ${JSON.stringify(rooms)}; export default ${JSON.stringify(artworks).replace(/"__ASSET_(.*?)__"/g, "import.meta.ROLLUP_FILE_URL_$1")};`;
      },
      configureServer(server) {
        server.watcher.add([path.resolve("_rooms"), path.resolve("_artworks")]);
        server.watcher.on("all", (event, file) => {
          const relative = path
            .relative(process.cwd(), file)
            .split(path.sep)
            .join("/");
          if (
            !["add", "change", "unlink"].includes(event) ||
            !/^_(rooms|artworks)\//.test(relative)
          )
            return;
          const module =
            server.environments.client.moduleGraph.getModuleById(
              "\0collection",
            );
          if (module)
            server.environments.client.moduleGraph.invalidateModule(module);
          server.ws.send({ type: "full-reload" });
        });
        server.middlewares.use(async (req, res, next) => {
          const match = req.url?.match(
            /^\/rooms\/([a-z0-9-]+)(?:\.html|\/(?:index\.html)?)$/,
          );
          if (!match) return next();
          if (!(await readRooms()).some((room) => room.id === match[1]))
            return next();
          res.writeHead(302, { Location: `/?gallery=${match[1]}` });
          res.end();
        });
        // Vite's dev server does not emit Rollup assets; serve the same collection directly.
        server.middlewares.use("/__artwork/", async (req, res, next) => {
          try {
            const file = path.resolve(
              "assets/artwork",
              decodeURIComponent(req.url.split("?")[0].slice(1)),
            );
            if (!file.startsWith(path.resolve("assets/artwork") + path.sep))
              return next();
            const buffer = await sharp(file)
              .rotate()
              .resize({ width: 1600, withoutEnlargement: true })
              .webp({ quality: 86 })
              .toBuffer();
            res.setHeader("Content-Type", "image/webp");
            res.end(buffer);
          } catch {
            next();
          }
        });
      },
    },
  ],
});
