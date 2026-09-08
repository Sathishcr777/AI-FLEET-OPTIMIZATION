import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const targetDir = "C:\\Users\\Asus\\.gemini\\antigravity-ide\\brain\\f44c4e81-9df5-4155-b51d-afe0335935e8";
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const chromePath = "C:\\Program Files\\Google\Chrome\\Application\\chrome.exe";

const pagesToCapture = [
  { name: "command_center.png", url: "http://localhost:3000/" },
  { name: "vehicle_intelligence.png", url: "http://localhost:3000/vehicles" },
  { name: "vehicle_workstation.png", url: "http://localhost:3000/vehicles?id=22222222-2222-2222-2222-222222222201" },
  { name: "live_map.png", url: "http://localhost:3000/map" },
  { name: "driver_safety.png", url: "http://localhost:3000/drivers" },
  { name: "predictive_maintenance.png", url: "http://localhost:3000/maintenance" },
  { name: "alert_center.png", url: "http://localhost:3000/alerts" },
  { name: "route_optimizer.png", url: "http://localhost:3000/routes" },
  { name: "analytics_lab.png", url: "http://localhost:3000/analytics" },
];

async function capture() {
  console.log("Launching local Chrome...");
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1920,1080"],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  });

  const page = await browser.newPage();

  for (const item of pagesToCapture) {
    const filePath = path.join(targetDir, item.name);
    console.log(`Navigating to ${item.url} -> ${item.name}...`);
    try {
      await page.goto(item.url, { waitUntil: "networkidle0", timeout: 20000 });
      await new Promise((r) => setTimeout(r, 1200)); // Allow animations / charts to render
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`[PASS] Captured ${item.name}`);
    } catch (e) {
      console.error(`[FAIL] ${item.name}: ${e.message}`);
    }
  }

  await browser.close();
  console.log("All screenshots captured successfully!");
}

capture();
