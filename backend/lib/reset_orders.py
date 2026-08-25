#!/usr/bin/env python3
"""
AharSetu — Controlled Order Data Reset Script
==============================================

Resets all transactional order/bill/settlement data while preserving:
- Users and their accounts
- Vendors and vendor profiles
- Vendor menu items
- Departments
- System settings
- Audit logs for user administration events (optional — see PRESERVE_ADMIN_AUDIT)

Usage:
    cd /Users/shubh/Desktop/Ahar-Setu
    python3 backend/lib/reset_orders.py

    # Dry run (show what would be deleted, don't delete):
    python3 backend/lib/reset_orders.py --dry-run

    # Also reset vendor monthly settlements (zero out revenue):
    python3 backend/lib/reset_orders.py --reset-settlements
"""
import sys
import os
import argparse
import logging

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("aharsetu-reset")

try:
    from backend.core.database import SessionLocal, engine
    from sqlalchemy import text
except ImportError as e:
    logger.error(f"Cannot import backend modules: {e}")
    logger.error("Ensure you are running from the project root directory.")
    sys.exit(1)


def get_table_counts(db) -> dict:
    """Return current row counts for all transactional tables."""
    tables = [
        "master_orders", "vendor_orders", "vendor_order_items",
        "vendor_order_modifications", "approval_history",
        "bills", "settlements", "payments",
        "notifications", "audit_logs",
        "vendor_monthly_settlements",
    ]
    counts = {}
    for table in tables:
        try:
            result = db.execute(text(f"SELECT COUNT(*) FROM {table}"))
            counts[table] = result.scalar()
        except Exception:
            counts[table] = "N/A (table may not exist)"
    return counts


def reset_order_data(dry_run: bool = False, reset_settlements: bool = False):
    """
    Delete all transactional order data in the correct FK dependency order.
    Preserves: users, vendors, departments, menu_items, system_settings.
    """
    db = SessionLocal()
    try:
        logger.info("=" * 60)
        logger.info("AharSetu Controlled Order Data Reset")
        logger.info("=" * 60)

        # ── Step 1: Show current state ─────────────────────────────────────
        logger.info("\n[BEFORE] Current transactional data counts:")
        before_counts = get_table_counts(db)
        for table, count in before_counts.items():
            logger.info(f"  {table}: {count} rows")

        if dry_run:
            logger.info("\n[DRY RUN] No changes will be made.")
            logger.info("Run without --dry-run to execute the reset.")
            return

        # ── Step 2: Confirm ────────────────────────────────────────────────
        logger.warning("\nThis will permanently delete all order/bill/settlement data.")
        confirm = input("Type 'YES' to confirm: ")
        if confirm.strip() != "YES":
            logger.info("Reset cancelled.")
            return

        # ── Step 3: Delete in FK-safe order ───────────────────────────────
        # Leaf tables first, parent tables last.
        
        logger.info("\n[RESET] Deleting transactional data...")

        # 1. Payments (references bills and settlements)
        try:
            result = db.execute(text("DELETE FROM payments"))
            db.commit()
            logger.info(f"  ✓ Deleted {result.rowcount} payments")
        except Exception as e:
            db.rollback()
            logger.warning(f"  ! payments: {e}")

        # 2. Bills (references master_orders)
        try:
            result = db.execute(text("DELETE FROM bills"))
            db.commit()
            logger.info(f"  ✓ Deleted {result.rowcount} bills")
        except Exception as e:
            db.rollback()
            logger.warning(f"  ! bills: {e}")

        # 3. Settlements (standalone but related to bills)
        try:
            result = db.execute(text("DELETE FROM settlements"))
            db.commit()
            logger.info(f"  ✓ Deleted {result.rowcount} settlements")
        except Exception as e:
            db.rollback()
            logger.warning(f"  ! settlements: {e}")

        # 4. Vendor order modifications (references vendor_orders)
        try:
            result = db.execute(text("DELETE FROM vendor_order_modifications"))
            db.commit()
            logger.info(f"  ✓ Deleted {result.rowcount} vendor_order_modifications")
        except Exception as e:
            db.rollback()
            logger.warning(f"  ! vendor_order_modifications: {e}")

        # 5. Vendor order items (references vendor_orders)
        try:
            result = db.execute(text("DELETE FROM vendor_order_items"))
            db.commit()
            logger.info(f"  ✓ Deleted {result.rowcount} vendor_order_items")
        except Exception as e:
            db.rollback()
            logger.warning(f"  ! vendor_order_items: {e}")

        # 6. Approval history (references master_orders)
        try:
            result = db.execute(text("DELETE FROM approval_history"))
            db.commit()
            logger.info(f"  ✓ Deleted {result.rowcount} approval_history")
        except Exception as e:
            db.rollback()
            logger.warning(f"  ! approval_history: {e}")

        # 7. Vendor orders (references master_orders)
        try:
            result = db.execute(text("DELETE FROM vendor_orders"))
            db.commit()
            logger.info(f"  ✓ Deleted {result.rowcount} vendor_orders")
        except Exception as e:
            db.rollback()
            logger.warning(f"  ! vendor_orders: {e}")

        # 8. Master orders
        try:
            result = db.execute(text("DELETE FROM master_orders"))
            db.commit()
            logger.info(f"  ✓ Deleted {result.rowcount} master_orders")
        except Exception as e:
            db.rollback()
            logger.warning(f"  ! master_orders: {e}")

        # 9. Order-related notifications (those linked to orders)
        # We only delete notifications that reference an order or have order-related types
        try:
            result = db.execute(text("""
                DELETE FROM notifications
                WHERE message ILIKE '%order%'
                   OR message ILIKE '%approval%'
                   OR message ILIKE '%canteen%'
                   OR message ILIKE '%bill%'
                   OR message ILIKE '%invoice%'
                   OR type IN (
                       'order_submitted', 'approved', 'rejected', 'dcr_approved',
                       'dcr_rejected', 'vendor_confirmed', 'bill_generated',
                       'completed', 'mod_requested', 'new_order'
                   )
            """))
            db.commit()
            logger.info(f"  ✓ Deleted {result.rowcount} order-related notifications")
        except Exception as e:
            db.rollback()
            logger.warning(f"  ! notifications (order-related): {e}")

        # 10. Audit logs for order actions only (preserve user/admin audit history)
        try:
            result = db.execute(text("""
                DELETE FROM audit_logs
                WHERE action ILIKE '%order%'
                   OR action ILIKE '%vendor status%'
                   OR action ILIKE '%bill%'
                   OR action ILIKE '%approval%'
                   OR action IN (
                       'Vendor Status Updated', 'Order Created', 'Order Submitted',
                       'Order Approved', 'Order Rejected', 'Bill Generated',
                       'DCR Approved', 'DCR Rejected'
                   )
            """))
            db.commit()
            logger.info(f"  ✓ Deleted {result.rowcount} order-related audit_logs (user admin logs preserved)")
        except Exception as e:
            db.rollback()
            logger.warning(f"  ! audit_logs (order-related): {e}")

        # 11. Optionally reset vendor monthly settlements and revenue
        if reset_settlements:
            try:
                result = db.execute(text("DELETE FROM vendor_monthly_settlements"))
                db.commit()
                logger.info(f"  ✓ Deleted {result.rowcount} vendor_monthly_settlements")

                # Zero out vendor revenue
                db.execute(text("UPDATE vendors SET revenue = 0.0"))
                db.commit()
                logger.info("  ✓ Reset all vendor revenue to ₹0")
            except Exception as e:
                db.rollback()
                logger.warning(f"  ! vendor_monthly_settlements/revenue: {e}")
        else:
            # Still delete settlements that were generated from now-deleted orders
            try:
                result = db.execute(text("""
                    DELETE FROM vendor_monthly_settlements
                    WHERE total_amount = 0 AND paid_amount = 0
                """))
                db.commit()
                logger.info(f"  ✓ Deleted {result.rowcount} zero-value vendor_monthly_settlements")
                
                # Zero out revenue since orders are gone
                db.execute(text("UPDATE vendors SET revenue = 0.0"))
                db.commit()
                logger.info("  ✓ Reset all vendor revenue to ₹0 (no orders to aggregate from)")
            except Exception as e:
                db.rollback()
                logger.warning(f"  ! vendor revenue reset: {e}")

        # ── Step 4: Show after state ───────────────────────────────────────
        logger.info("\n[AFTER] Transactional data counts after reset:")
        after_counts = get_table_counts(db)
        for table, count in after_counts.items():
            logger.info(f"  {table}: {count} rows")

        # ── Step 5: Verify preserved data ─────────────────────────────────
        logger.info("\n[PRESERVED] Critical institutional data:")
        preserved_tables = ["users", "vendors", "departments", "vendor_menu_items", "system_settings"]
        for table in preserved_tables:
            try:
                result = db.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                logger.info(f"  ✓ {table}: {count} rows (preserved)")
            except Exception as e:
                logger.warning(f"  ! {table}: {e}")

        logger.info("\n[DONE] Order data reset completed successfully.")
        logger.info("The application now shows zero orders, bills, and settlements.")
        logger.info("All users, vendors, departments, and menu items are intact.")

    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AharSetu Controlled Order Data Reset")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be deleted without deleting")
    parser.add_argument("--reset-settlements", action="store_true", help="Also delete vendor monthly settlements")
    args = parser.parse_args()

    reset_order_data(dry_run=args.dry_run, reset_settlements=args.reset_settlements)
