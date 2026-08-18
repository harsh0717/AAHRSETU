import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.lib.pdf_generator import generate_invoice_pdf

def test_pdf_generation():
    try:
        print("Testing PDF generation...")
        pdf_bytes = generate_invoice_pdf(
            invoice_number="INV-ORD-123456-MASTER",
            date_str="2026-08-18 10:30:00",
            title="Independence Day Catering",
            purpose="Catering services for guest invitees and students on Independence day function.",
            department="Degree Engineering",
            coordinator_name="Prof. Rajesh Soni",
            order_id="ORD-123456",
            items=[
                {"name": "Tea", "quantity": 100, "price": 10.0, "subtotal": 1000.0, "vendor": "Sharma Canteen"},
                {"name": "Samosa", "quantity": 100, "price": 15.0, "subtotal": 1500.0, "vendor": "Sharma Canteen"},
                {"name": "Idli Sambhar", "quantity": 50, "price": 40.0, "subtotal": 2000.0, "vendor": "Fresh Bites"}
            ],
            grand_total=4500.0,
            approvals=[
                {"role": "COORDINATOR", "user": "Prof. Rajesh Soni", "timestamp": "2026-08-18 09:00:00"},
                {"role": "PRINCIPAL", "user": "Dr. Arvind Mehta", "timestamp": "2026-08-18 09:30:00"},
                {"role": "DCR", "user": "S. Patil", "timestamp": "2026-08-18 10:00:00"}
            ]
        )
        print(f"✓ PDF generated successfully! Size: {len(pdf_bytes)} bytes")
        
        # Write to a file to verify visually
        with open("scratch/test_invoice.pdf", "wb") as f:
            f.write(pdf_bytes)
        print("✓ Wrote PDF to scratch/test_invoice.pdf")
        
    except Exception as e:
        print(f"✗ PDF generation failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_pdf_generation()
