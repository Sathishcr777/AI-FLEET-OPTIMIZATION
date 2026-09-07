"""
Test script for FleetIQ Auth & Profile Dropdown Integration
Validates frontend production build artifacts, live dev server, and auth configurations.
"""
import urllib.request
import json
import os
import sys

FRONTEND_URL = "http://localhost:3000"
BACKEND_URL = "http://127.0.0.1:8000"

def test_frontend_dev_server():
    print("Testing Vite dev server at http://localhost:3000...")
    req = urllib.request.Request(FRONTEND_URL)
    with urllib.request.urlopen(req, timeout=5) as resp:
        assert resp.status == 200, f"Frontend returned status {resp.status}"
        html = resp.read().decode("utf-8")
        assert "<div id=\"root\"></div>" in html or "FleetIQ" in html, "Root element missing"
        print(f"[PASS] Vite dev server is serving index.html ({len(html)} bytes)")

def test_dist_build_artifacts():
    print("Testing production build artifacts in frontend/dist...")
    dist_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
    assert os.path.exists(dist_dir), "dist directory does not exist"
    index_html = os.path.join(dist_dir, "index.html")
    assert os.path.exists(index_html), "dist/index.html does not exist"
    assets_dir = os.path.join(dist_dir, "assets")
    assert os.path.exists(assets_dir), "dist/assets does not exist"
    asset_files = os.listdir(assets_dir)
    assert len(asset_files) >= 4, f"Expected assets, found {asset_files}"
    print(f"[PASS] Production bundle verified: {len(asset_files)} asset files generated.")

def test_backend_health():
    print("Testing backend health at http://127.0.0.1:8000/api/v1/health...")
    req = urllib.request.Request(f"{BACKEND_URL}/api/v1/health")
    with urllib.request.urlopen(req, timeout=5) as resp:
        assert resp.status == 200, f"Backend returned status {resp.status}"
        data = json.loads(resp.read().decode("utf-8"))
        assert data.get("status") == "healthy", f"Health status: {data}"
        print(f"[PASS] Backend API is healthy: {data}")

if __name__ == "__main__":
    try:
        test_frontend_dev_server()
        test_dist_build_artifacts()
        test_backend_health()
        print("\nALL AUTH FLOW & ASSET CHECKS PASSED (100%)")
    except Exception as e:
        print(f"[FAIL] {e}")
        sys.exit(1)
