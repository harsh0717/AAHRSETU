import urllib.request
import json
import sys

# Configure UTF-8 safe output for Windows CP1252 consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

FRONTEND_URL = "http://127.0.0.1:3000"
BACKEND_URL = "http://127.0.0.1:8000"

def test_url(url, expected_code=200, is_json=False):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AharSetu-Verifier/1.0"})
        with urllib.request.urlopen(req, timeout=10) as res:
            status = res.status
            content = res.read()
            if status != expected_code:
                return False, f"Expected {expected_code}, got {status}"
            if is_json:
                data = json.loads(content.decode("utf-8"))
                return True, f"JSON OK: {type(data)}"
            return True, f"OK ({len(content)} bytes)"
    except Exception as e:
        return False, str(e)

def test_post_json(url, payload, expected_code=200):
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", "User-Agent": "AharSetu-Verifier/1.0"}, method="POST")
        with urllib.request.urlopen(req, timeout=10) as res:
            status = res.status
            content = res.read()
            if status != expected_code:
                return False, f"Expected {expected_code}, got {status}"
            parsed = json.loads(content.decode("utf-8"))
            return True, parsed
    except Exception as e:
        return False, str(e)

def main():
    print("=" * 70)
    print(" AHARSETU ENTERPRISE FULL DUAL-SIDE (DEV + CLIENT) E2E VERIFICATION")
    print("=" * 70)

    results = []

    # -------------------------------------------------------------
    # 1. DEVELOPER-SIDE BACKEND VERIFICATION (FastAPI direct port 8000)
    # -------------------------------------------------------------
    print("\n[SECTION 1: DEVELOPER-SIDE BACKEND API CHECKS]")
    backend_checks = [
        ("FastAPI OpenAPI JSON", f"{BACKEND_URL}/openapi.json", 200, True),
        ("FastAPI Swagger Docs", f"{BACKEND_URL}/docs", 200, False),
        ("Public Settings API", f"{BACKEND_URL}/api/v1/settings/public", 200, True),
        ("Public Directory API", f"{BACKEND_URL}/api/v1/users/public-directory", 200, True),
    ]

    for name, url, code, is_j in backend_checks:
        ok, msg = test_url(url, expected_code=code, is_json=is_j)
        mark = "[PASS]" if ok else "[FAIL]"
        print(f"  {mark} {name}: {msg}")
        results.append((name, ok, msg))

    # Test Multi-Role Authentication via Backend
    print("\n[SECTION 2: AUTHENTICATION & SESSIONS FOR ALL 5 ROLES]")
    roles_to_test = [
        ("Admin Login", "admin@aharsetu.edu.in", "Admin@123", "admin"),
        ("Coordinator Login", "coord.diploma@aharsetu.edu.in", "Coord@123", "coordinator"),
        ("Principal Login", "principal.dd@aharsetu.edu.in", "Principal@123", "principal"),
        ("DCR / Administration Login", "dcr@aharsetu.edu.in", "DCR@123", "dcr"),
        ("Vendor Login", "vendor1@aharsetu.edu.in", "Vendor@123", "vendor"),
    ]

    for role_name, email, password, role in roles_to_test:
        payload = {"email": email, "password": password, "role": role}
        ok, res = test_post_json(f"{BACKEND_URL}/api/v1/auth/login", payload)
        if ok and isinstance(res, dict) and "access_token" in res:
            mark = "[PASS]"
            msg = f"Token received, user id: {res.get('user', {}).get('id')}"
            results.append((role_name, True, msg))
        else:
            mark = "[FAIL]"
            msg = str(res)
            results.append((role_name, False, msg))
        print(f"  {mark} {role_name}: {msg}")

    # -------------------------------------------------------------
    # 2. CLIENT-SIDE NEXT.JS VERIFICATION (Next.js server port 3000)
    # -------------------------------------------------------------
    print("\n[SECTION 3: CLIENT-SIDE REWRITE PROXIES (Next.js -> Backend)]")
    proxy_checks = [
        ("Proxied Settings API (/api/v1/settings/public)", f"{FRONTEND_URL}/api/v1/settings/public", 200, True),
        ("Proxied User Directory (/api/v1/users/public-directory)", f"{FRONTEND_URL}/api/v1/users/public-directory", 200, True),
    ]
    for name, url, code, is_j in proxy_checks:
        ok, msg = test_url(url, expected_code=code, is_json=is_j)
        mark = "[PASS]" if ok else "[FAIL]"
        print(f"  {mark} {name}: {msg}")
        results.append((name, ok, msg))

    print("\n[SECTION 4: CLIENT-SIDE PAGES & DASHBOARD ROUTES]")
    client_pages = [
        ("Login Page", f"{FRONTEND_URL}/login"),
        ("Admin Dashboard", f"{FRONTEND_URL}/admin"),
        ("Admin Orders", f"{FRONTEND_URL}/admin/orders"),
        ("Admin Bills", f"{FRONTEND_URL}/admin/bills"),
        ("Admin Vendors", f"{FRONTEND_URL}/admin/vendors"),
        ("Admin Departments", f"{FRONTEND_URL}/admin/departments"),
        ("Admin Reports", f"{FRONTEND_URL}/admin/reports"),
        ("Admin Analytics", f"{FRONTEND_URL}/admin/analytics"),
        ("Admin System Health", f"{FRONTEND_URL}/admin/system-health"),
        ("Coordinator Dashboard", f"{FRONTEND_URL}/coordinator"),
        ("Coordinator Create Order", f"{FRONTEND_URL}/coordinator/orders/create"),
        ("Coordinator Orders List", f"{FRONTEND_URL}/coordinator/orders"),
        ("Principal Dashboard", f"{FRONTEND_URL}/principal"),
        ("Principal Approval Queue", f"{FRONTEND_URL}/principal/approvals"),
        ("Principal Bills", f"{FRONTEND_URL}/principal/bills"),
        ("DCR Dashboard", f"{FRONTEND_URL}/dcr"),
        ("DCR Settlements", f"{FRONTEND_URL}/dcr/settlements"),
        ("DCR Reports", f"{FRONTEND_URL}/dcr/reports"),
        ("Administration Redirect Route", f"{FRONTEND_URL}/administration"),
        ("Vendor Dashboard", f"{FRONTEND_URL}/vendor"),
        ("Vendor Incoming Orders", f"{FRONTEND_URL}/vendor/orders/incoming"),
        ("Vendor Revenue", f"{FRONTEND_URL}/vendor/revenue"),
        ("Flyer Page", f"{FRONTEND_URL}/flyer"),
        ("Terms Page", f"{FRONTEND_URL}/terms"),
        ("Privacy Page", f"{FRONTEND_URL}/privacy"),
    ]

    for name, url in client_pages:
        ok, msg = test_url(url, expected_code=200, is_json=False)
        mark = "[PASS]" if ok else "[FAIL]"
        print(f"  {mark} {name}: {msg}")
        results.append((name, ok, msg))

    print("\n[SECTION 5: CLIENT STATIC ASSETS & PWA]")
    static_assets = [
        ("Brand Logo PNG", f"{FRONTEND_URL}/images/aharsetu_brand_logo_v3.png"),
        ("Brand Logo WebP", f"{FRONTEND_URL}/images/aharsetu_brand_logo_v3.webp"),
        ("Dining Hero Banner", f"{FRONTEND_URL}/images/campus_dining_hero_v3.webp"),
        ("PWA Web Manifest", f"{FRONTEND_URL}/manifest.json"),
        ("Service Worker script", f"{FRONTEND_URL}/sw.js"),
    ]

    for name, url in static_assets:
        ok, msg = test_url(url, expected_code=200, is_json=False)
        mark = "[PASS]" if ok else "[FAIL]"
        print(f"  {mark} {name}: {msg}")
        results.append((name, ok, msg))

    # Summary
    failed = [r for r in results if not r[1]]
    print("\n" + "=" * 70)
    if not failed:
        print(f" ALL {len(results)} DUAL-SIDE VERIFICATION CHECKS PASSED (100% SUCCESS)!")
        print("=" * 70)
        sys.exit(0)
    else:
        print(f" {len(failed)} CHECK(S) FAILED OUT OF {len(results)}:")
        for name, ok, msg in failed:
            print(f"   - {name}: {msg}")
        print("=" * 70)
        sys.exit(1)

if __name__ == "__main__":
    main()
