from io import BytesIO, StringIO
import csv
from datetime import datetime
import calendar

try:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False


def _style_header_row(ws, row_num: int, col_count: int):
    """Apply header styling to a row in openpyxl."""
    if not OPENPYXL_AVAILABLE:
        return
    for col in range(1, col_count + 1):
        cell = ws.cell(row=row_num, column=col)
        cell.font = Font(bold=True, color='FFFFFF', size=10)
        cell.fill = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)


def _auto_width(ws):
    """Auto-fit column widths in openpyxl."""
    if not OPENPYXL_AVAILABLE:
        return
    for column_cells in ws.columns:
        max_length = 0
        column = column_cells[0].column_letter
        for cell in column_cells:
            try:
                if len(str(cell.value or '')) > max_length:
                    max_length = len(str(cell.value or ''))
            except:
                pass
        adjusted_width = min(max_length + 4, 50)
        ws.column_dimensions[column].width = max(adjusted_width, 10)


def generate_bills_excel(month: int, year: int, bills: list, summary: dict) -> bytes:
    """
    Generate a multi-sheet Excel workbook for monthly bills.
    Uses openpyxl if installed, otherwise exports structured CSV data.
    """
    month_name = calendar.month_name[month] if 1 <= month <= 12 else str(month)

    if OPENPYXL_AVAILABLE:
        wb = Workbook()
        
        # Sheet 1: Summary
        ws_summary = wb.active
        ws_summary.title = 'Summary'
        ws_summary.append(['AaharSetu Monthly Bills Summary'])
        ws_summary['A1'].font = Font(bold=True, size=14, color='1E3A8A')
        ws_summary.append([f'Month: {month_name} {year}'])
        ws_summary.append([f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}'])
        ws_summary.append([])
        ws_summary.append(['Metric', 'Value'])
        _style_header_row(ws_summary, 5, 2)
        ws_summary.append(['Total Bills', summary.get('total_bills', len(bills))])
        ws_summary.append(['Total Amount', f"₹{float(summary.get('total_amount', 0)):,.2f}"])
        ws_summary.append(['Pending Settlement', f"₹{float(summary.get('pending_amount', 0)):,.2f}"])
        ws_summary.append(['Settled', f"₹{float(summary.get('settled_amount', 0)):,.2f}"])
        ws_summary.append(['Number of Departments', summary.get('dept_count', 0)])
        ws_summary.append(['Number of Vendors', summary.get('vendor_count', 0)])
        _auto_width(ws_summary)
        
        # Sheet 2: Bill Details
        ws_bills = wb.create_sheet('Bill Details')
        headers = ['Invoice Number', 'Order ID', 'Department', 'Vendor', 'Order Date', 'Bill Date', 'Amount', 'Settlement Status']
        ws_bills.append(headers)
        _style_header_row(ws_bills, 1, len(headers))
        for b in bills:
            ws_bills.append([
                b.get('invoice_number', ''),
                b.get('order_id', ''),
                b.get('department_label', '') or b.get('department_id', ''),
                b.get('vendor_name', '') or 'Master Invoice',
                b.get('order_created_at', ''),
                b.get('generated_at', ''),
                float(b.get('amount', 0)),
                b.get('settlement_status', 'PENDING_SETTLEMENT'),
            ])
        _auto_width(ws_bills)
        
        # Sheet 3: Vendor Summary
        ws_vendors = wb.create_sheet('Vendor Summary')
        ws_vendors.append(['Vendor', 'Bill Count', 'Total Amount', 'Settlement Status'])
        _style_header_row(ws_vendors, 1, 4)
        vendor_map = {}
        for b in bills:
            vname = b.get('vendor_name') or 'Master Invoice'
            if vname not in vendor_map:
                vendor_map[vname] = {'count': 0, 'amount': 0.0, 'status': b.get('settlement_status', 'PENDING_SETTLEMENT')}
            vendor_map[vname]['count'] += 1
            vendor_map[vname]['amount'] += float(b.get('amount', 0))
        for vname, vdata in vendor_map.items():
            ws_vendors.append([vname, vdata['count'], vdata['amount'], vdata['status']])
        _auto_width(ws_vendors)
        
        # Sheet 4: Department Summary
        ws_depts = wb.create_sheet('Department Summary')
        ws_depts.append(['Department', 'Bill Count', 'Total Amount', 'Settlement Status'])
        _style_header_row(ws_depts, 1, 4)
        dept_map = {}
        for b in bills:
            dname = b.get('department_label') or b.get('department_id', 'Unknown')
            if dname not in dept_map:
                dept_map[dname] = {'count': 0, 'amount': 0.0, 'status': b.get('settlement_status', 'PENDING_SETTLEMENT')}
            dept_map[dname]['count'] += 1
            dept_map[dname]['amount'] += float(b.get('amount', 0))
        for dname, ddata in dept_map.items():
            ws_depts.append([dname, ddata['count'], ddata['amount'], ddata['status']])
        _auto_width(ws_depts)
        
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()
    else:
        # Fallback to UTF-8 CSV
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow([f'AaharSetu Monthly Bills — {month_name} {year}'])
        writer.writerow(['Invoice Number', 'Order ID', 'Department', 'Vendor', 'Bill Date', 'Amount', 'Settlement Status'])
        for b in bills:
            writer.writerow([
                b.get('invoice_number', ''),
                b.get('order_id', ''),
                b.get('department_label', '') or b.get('department_id', ''),
                b.get('vendor_name', '') or 'Master Invoice',
                b.get('generated_at', ''),
                b.get('amount', 0),
                b.get('settlement_status', 'PENDING_SETTLEMENT'),
            ])
        return output.getvalue().encode('utf-8-sig')


def generate_settlement_excel(settlement: dict, dept_breakdown: list, vendor_breakdown: list, bills: list) -> bytes:
    """
    Generate a multi-sheet Excel workbook for a settlement.
    Sheets: Summary | Department Expenditure | Vendor Settlement | Bill Details | Settlement Info
    """
    month = settlement.get('month', 1)
    month_name = calendar.month_name[month] if 1 <= month <= 12 else str(month)
    year = settlement.get('year', datetime.now().year)

    if OPENPYXL_AVAILABLE:
        wb = Workbook()
        
        # Sheet 1: Summary
        ws_summary = wb.active
        ws_summary.title = 'Summary'
        ws_summary.append([f'AaharSetu Settlement Report — {month_name} {year}'])
        ws_summary['A1'].font = Font(bold=True, size=14, color='1E3A8A')
        ws_summary.append([f'Settlement Number: {settlement.get("settlement_number", "")}'])
        ws_summary.append([f'Status: {settlement.get("status", "")}'])
        ws_summary.append([f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}'])
        ws_summary.append([])
        ws_summary.append(['Metric', 'Value'])
        _style_header_row(ws_summary, 6, 2)
        ws_summary.append(['Total Bills', settlement.get('total_bills', 0)])
        ws_summary.append(['Total Amount', f"₹{float(settlement.get('total_amount', 0)):,.2f}"])
        ws_summary.append(['Settled Amount', f"₹{float(settlement.get('settled_amount', 0)):,.2f}"])
        ws_summary.append(['Pending Amount', f"₹{float(settlement.get('pending_amount', 0)):,.2f}"])
        ws_summary.append(['Finalized By', settlement.get('creator_name', '') or '—'])
        ws_summary.append(['Finalized At', str(settlement.get('finalized_at', 'Not yet finalized'))])
        _auto_width(ws_summary)
        
        # Sheet 2: Department Expenditure
        ws_dept = wb.create_sheet('Department Expenditure')
        ws_dept.append(['Department', 'Bill Count', 'Total Amount', 'Settled Amount', 'Pending Amount'])
        _style_header_row(ws_dept, 1, 5)
        for d in dept_breakdown:
            ws_dept.append([
                d.get('department_name', ''),
                d.get('bill_count', 0),
                float(d.get('total_amount', 0)),
                float(d.get('settled_amount', 0)),
                float(d.get('pending_amount', 0))
            ])
        _auto_width(ws_dept)
        
        # Sheet 3: Vendor Settlement
        ws_vendor = wb.create_sheet('Vendor Settlement')
        ws_vendor.append(['Vendor', 'Bill Count', 'Total Amount', 'Settled Amount', 'Pending Amount'])
        _style_header_row(ws_vendor, 1, 5)
        for v in vendor_breakdown:
            ws_vendor.append([
                v.get('vendor_name', ''),
                v.get('bill_count', 0),
                float(v.get('total_amount', 0)),
                float(v.get('settled_amount', 0)),
                float(v.get('pending_amount', 0))
            ])
        _auto_width(ws_vendor)
        
        # Sheet 4: Bill Details
        ws_bills = wb.create_sheet('Bill Details')
        headers = ['Invoice Number', 'Order ID', 'Department', 'Vendor', 'Bill Date', 'Amount', 'Settlement Status']
        ws_bills.append(headers)
        _style_header_row(ws_bills, 1, len(headers))
        for b in bills:
            ws_bills.append([
                b.get('invoice_number', ''),
                b.get('order_id', ''),
                b.get('department_label', '') or b.get('department_id', ''),
                b.get('vendor_name', '') or 'Master Invoice',
                b.get('generated_at', ''),
                float(b.get('amount', 0)),
                b.get('settlement_status', '')
            ])
        _auto_width(ws_bills)
        
        # Sheet 5: Settlement Info
        ws_info = wb.create_sheet('Settlement Info')
        ws_info.append(['Field', 'Value'])
        _style_header_row(ws_info, 1, 2)
        ws_info.append(['Settlement Number', settlement.get('settlement_number', '')])
        ws_info.append(['Month', month_name])
        ws_info.append(['Year', year])
        ws_info.append(['Status', settlement.get('status', '')])
        ws_info.append(['Total Bills', settlement.get('total_bills', 0)])
        ws_info.append(['Total Amount', float(settlement.get('total_amount', 0))])
        ws_info.append(['Settled Amount', float(settlement.get('settled_amount', 0))])
        ws_info.append(['Pending Amount', float(settlement.get('pending_amount', 0))])
        ws_info.append(['Created By', settlement.get('creator_name', '') or '—'])
        ws_info.append(['Created At', str(settlement.get('created_at', ''))])
        ws_info.append(['Finalized At', str(settlement.get('finalized_at', 'Not finalized'))])
        _auto_width(ws_info)
        
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()
    else:
        # Fallback to UTF-8 CSV
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow([f'AaharSetu Settlement — {settlement.get("settlement_number", "")} ({month_name} {year})'])
        writer.writerow(['Invoice Number', 'Order ID', 'Department', 'Vendor', 'Bill Date', 'Amount', 'Settlement Status'])
        for b in bills:
            writer.writerow([
                b.get('invoice_number', ''),
                b.get('order_id', ''),
                b.get('department_label', '') or b.get('department_id', ''),
                b.get('vendor_name', '') or 'Master Invoice',
                b.get('generated_at', ''),
                b.get('amount', 0),
                b.get('settlement_status', '')
            ])
        return output.getvalue().encode('utf-8-sig')
