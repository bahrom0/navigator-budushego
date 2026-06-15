const { spawn } = require("child_process");
const os = require("os");

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

function getPort() {
  return process.env.PORT || 3000;
}

async function generateQrCode(url) {
  try {
    const QRCode = require("qrcode-terminal");
    QRCode.generate(url, { small: true });
  } catch (e) {
    console.log(`  Scan QR code or open: ${url}`);
  }
}

async function main() {
  const localIp = getLocalIp();
  const port = getPort();
  const url = `http://${localIp}:${port}`;

  console.log("\n🔗 Dev Server URLs:");
  console.log(`  Local:   http://localhost:${port}`);
  console.log(`  Network: ${url}`);
  console.log("\n");

  await generateQrCode(url);

  const devProcess = spawn("npx", ["next", "dev", "-H", "0.0.0.0", "-p", port.toString()], {
    stdio: "inherit",
    shell: true,
    cwd: process.cwd(),
  });

  devProcess.on("close", (code) => {
    process.exit(code);
  });
}

main().catch(console.error);