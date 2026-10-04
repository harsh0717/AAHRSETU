import os
import sys

# Ensure repository root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

def main():
    print("=" * 60)
    print(" AHARSETU ENTERPRISE AUTOMATED BACKEND TEST RUNNER")
    print("=" * 60)
    
    failures = []
    
    # 1. Comprehensive app test
    print("\n--- [1/6] Running test_comprehensive_app ---")
    try:
        from tests import test_comprehensive_app
        test_comprehensive_app.test_public_endpoints()
        test_comprehensive_app.test_vendor_menu_counts()
        test_comprehensive_app.test_login_and_auth_flow()
        print("[PASS] test_comprehensive_app passed")
    except Exception as e:
        print(f"[FAIL] test_comprehensive_app failed: {e}")
        failures.append(("test_comprehensive_app", e))
        
    # 2. PDF generation test
    print("\n--- [2/6] Running test_pdf ---")
    try:
        from tests import test_pdf
        test_pdf.test_pdf_generation()
        print("[PASS] test_pdf passed")
    except Exception as e:
        print(f"[FAIL] test_pdf failed: {e}")
        failures.append(("test_pdf", e))
        
    # 3. Security & Rate Limiting test
    print("\n--- [3/6] Running test_security ---")
    try:
        from tests import test_security
        test_security.run_tests()
        print("[PASS] test_security passed")
    except Exception as e:
        print(f"[FAIL] test_security failed: {e}")
        failures.append(("test_security", e))
        
    # 4. New APIs test
    print("\n--- [4/6] Running test_new_apis ---")
    try:
        from tests import test_new_apis
        test_new_apis.run_new_api_tests()
        print("[PASS] test_new_apis passed")
    except Exception as e:
        print(f"[FAIL] test_new_apis failed: {e}")
        failures.append(("test_new_apis", e))

    # 5. Profile & Onboarding test
    print("\n--- [5/6] Running test_profile_onboarding ---")
    try:
        from tests import test_profile_onboarding
        test_profile_onboarding.run_onboarding_tests()
        print("[PASS] test_profile_onboarding passed")
    except Exception as e:
        print(f"[FAIL] test_profile_onboarding failed: {e}")
        failures.append(("test_profile_onboarding", e))

    # 6. Vendor confirm test
    print("\n--- [6/6] Running test_vendor_confirm ---")
    try:
        from tests import test_vendor_confirm
        test_vendor_confirm.run_test()
        print("[PASS] test_vendor_confirm passed")
    except Exception as e:
        print(f"[FAIL] test_vendor_confirm failed: {e}")
        failures.append(("test_vendor_confirm", e))

    print("\n" + "=" * 60)
    if not failures:
        print(" ALL 6 TEST SUITES PASSED CLEANLY (100% SUCCESS)!")
        print("=" * 60)
        sys.exit(0)
    else:
        print(f" {len(failures)} SUITE(S) FAILED:")
        for name, err in failures:
            print(f"  - {name}: {err}")
        print("=" * 60)
        sys.exit(1)

if __name__ == "__main__":
    main()
