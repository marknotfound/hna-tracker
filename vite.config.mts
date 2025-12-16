import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Copy data files to dist during build
function copyDataPlugin() {
  return {
    name: "copy-data",
    closeBundle() {
      const srcDir = path.resolve(__dirname, "data");
      const destDir = path.resolve(__dirname, "dist", "data");

      if (fs.existsSync(srcDir)) {
        copyRecursive(srcDir, destDir);
        console.log("Copied data directory to dist/data");
      }
    },
  };
}

function copyRecursive(src: string, dest: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      // Skip .gitkeep files
      if (entry.name !== ".gitkeep") {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

// Serve data directory in development
function serveDataPlugin() {
  return {
    name: "serve-data",
    configureServer(server: any) {
      // Add middleware to serve data files before Vite's default middleware
      server.middlewares.use((req: any, res: any, next: any) => {
        // Check if request is for /data/*
        if (req.url && req.url.startsWith("/data/")) {
          // Remove /data prefix to get the relative path
          const relativePath = req.url.slice(6); // Remove '/data/'
          const dataPath = path.resolve(__dirname, "data", relativePath);

          if (fs.existsSync(dataPath) && fs.statSync(dataPath).isFile()) {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            fs.createReadStream(dataPath).pipe(res);
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveDataPlugin(), copyDataPlugin()],
  root: path.resolve(__dirname, "src/frontend"),
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
  // Base path for GitHub Pages deployment
  base: "./",
});
