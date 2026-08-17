from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_invoice_pdf(
    invoice_number: str,
    date_str: str,
    title: str,
    purpose: str,
    department: str,
    coordinator_name: str,
    order_id: str,
    items: list,  # list of {"name": str, "quantity": int, "price": float, "subtotal": float, "vendor": str}
    grand_total: float,
    approvals: list,  # list of {"role": str, "user": str, "timestamp": str}
    vendor_name: str = None
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    story = []
    styles = getSampleStyleSheet()

    # Define custom styles
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#1E3A8A'),
        alignment=0,
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'InvoiceSub',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=14,
        textColor=colors.HexColor('#F97316'),
        alignment=0,
        spaceAfter=15
    )
    meta_label_style = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#475569')
    )
    meta_val_style = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#0F172A')
    )
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=14,
        textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=12,
        spaceAfter=6
    )
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white,
        alignment=0
    )
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#334155')
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#0F172A')
    )

    # 1. Header (Brand spelling & title)
    story.append(Paragraph("Aaharસેતુ (AaharSetu)", title_style))
    story.append(Paragraph("Connecting People Through Better Food.", subtitle_style))

    # 2. Metadata block
    meta_data = [
        [
            Paragraph("Invoice Number:", meta_label_style), Paragraph(invoice_number, meta_val_style),
            Paragraph("Date:", meta_label_style), Paragraph(date_str, meta_val_style)
        ],
        [
            Paragraph("Order ID:", meta_label_style), Paragraph(order_id, meta_val_style),
            Paragraph("Department:", meta_label_style), Paragraph(department, meta_val_style)
        ],
        [
            Paragraph("Coordinator:", meta_label_style), Paragraph(coordinator_name, meta_val_style),
            Paragraph("Type:", meta_label_style), Paragraph(f"{vendor_name} Split Invoice" if vendor_name else "Master Summary Invoice", meta_val_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[100, 160, 80, 180])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))

    # 3. Order title and purpose
    story.append(Paragraph("Order Purpose & Description", section_title_style))
    story.append(Paragraph(f"<b>Title:</b> {title}", table_cell_style))
    story.append(Paragraph(f"<b>Purpose:</b> {purpose}", table_cell_style))
    story.append(Spacer(1, 15))

    # 4. Itemized List
    story.append(Paragraph("Itemized Details", section_title_style))
    
    # Headers
    headers = [
        Paragraph("Item Name", table_header_style),
        Paragraph("Quantity", table_header_style),
        Paragraph("Unit Price", table_header_style),
        Paragraph("Subtotal", table_header_style)
    ]
    if not vendor_name:
        headers.append(Paragraph("Vendor", table_header_style))
        
    table_rows = [headers]
    
    for item in items:
        row = [
            Paragraph(item["name"], table_cell_style),
            Paragraph(str(item["quantity"]), table_cell_style),
            Paragraph(f"INR {item['price']:.2f}", table_cell_style),
            Paragraph(f"INR {item['subtotal']:.2f}", table_cell_style)
        ]
        if not vendor_name:
            row.append(Paragraph(item.get("vendor", "N/A"), table_cell_style))
        table_rows.append(row)
        
    # Grand Total Row
    total_row = [
        Paragraph("Grand Total", table_cell_bold),
        Paragraph("", table_cell_style),
        Paragraph("", table_cell_style),
        Paragraph(f"INR {grand_total:.2f}", table_cell_bold)
    ]
    if not vendor_name:
        total_row.append(Paragraph("", table_cell_style))
    table_rows.append(total_row)

    col_widths = [180, 85, 90, 95]
    if not vendor_name:
        col_widths = [150, 70, 75, 80, 145]
        
    items_table = Table(table_rows, colWidths=col_widths)
    items_table_style = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E3A8A')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-2), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#F8FAFC')),
        ('LINEABOVE', (0,-1), (-1,-1), 1.5, colors.HexColor('#1E3A8A')),
    ]
    items_table.setStyle(TableStyle(items_table_style))
    story.append(items_table)
    story.append(Spacer(1, 20))

    # 5. Approval History Block
    story.append(Paragraph("System Approval Timeline", section_title_style))
    approval_rows = [
        [
            Paragraph("Role / Stage", table_header_style),
            Paragraph("Authorized Signature", table_header_style),
            Paragraph("Timestamp", table_header_style)
        ]
    ]
    for app in approvals:
        approval_rows.append([
            Paragraph(app["role"], table_cell_style),
            Paragraph(app["user"], table_cell_bold),
            Paragraph(app["timestamp"], table_cell_style)
        ])
    if len(approvals) == 0:
        approval_rows.append([
            Paragraph("System Generated", table_cell_style),
            Paragraph("AUTO-VERIFIED", table_cell_bold),
            Paragraph(datetime.now().strftime("%Y-%m-%d %H:%M:%S"), table_cell_style)
        ])
        
    app_table = Table(approval_rows, colWidths=[150, 200, 170])
    app_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#475569')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
    ]))
    story.append(app_table)

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
