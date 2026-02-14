const { execSync } = require("child_process");
const { existsSync, mkdirSync, chmodSync } = require("fs");
const { join } = require("path");

const REPO = "circlesac/notas-cli";
const BIN_DIR = join(__dirname, "bin", "native");
const BIN_PATH = join(BIN_DIR, "notas");

const PLATFORM_MAP = {
  "darwin-arm64": "notas-darwin-arm64",
  "darwin-x64": "notas-darwin-x64",
  "linux-arm64": "notas-linux-arm64",
  "linux-x64": "notas-linux-x64"
};

async function install() {
  if (existsSync(BIN_PATH)) return;

  const platform = `${process.platform}-${process.arch}`;
  const name = PLATFORM_MAP[platform];
  if (!name) {
    console.error(`Unsupported platform: ${platform}`);
    process.exit(1);
  }

  const version = require("./package.json").version;
  const url = `https://github.com/${REPO}/releases/download/v${version}/${name}.tar.gz`;

  mkdirSync(BIN_DIR, { recursive: true });

  console.info(`Downloading notas v${version} for ${platform}...`);
  execSync(`curl -fsSL "${url}" | tar xz -C "${BIN_DIR}"`, { stdio: "inherit" });
  chmodSync(BIN_PATH, 0o755);
  console.info("Installed successfully.");
}

install().catch((err) => {
  console.error("Failed to install notas:", err.message);
  process.exit(1);
});
