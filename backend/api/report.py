"""
Report API — PDF export with Nova Canvas cover

Generates PDF: Cover (Nova Canvas) → Executive Summary → Technical Details → Remediation → Compliance → Appendix
"""
import io
import base64
from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/report", tags=["report"])


class ExportPdfRequest(BaseModel):
    incident_id: str
    markdown: str
    cover_image_base64: Optional[str] = None


def _render_pdf(incident_id: str, markdown: str, cover_b64: Optional[str]) -> bytes:
    """Generate PDF using reportlab — professional layout matching compliance report (blue header)."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        from reportlab.lib import colors
    except ImportError:
        raise HTTPException(status_code=500, detail="reportlab not installed. Run: pip install reportlab")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5 * inch, bottomMargin=0.5 * inch)
    styles = getSampleStyleSheet()
    story = []

    # Cover page
    cover_added = False
    if cover_b64:
        try:
            img_data = base64.b64decode(cover_b64.split(",")[-1] if "," in cover_b64 else cover_b64)
            img = Image(io.BytesIO(img_data), width=6 * inch, height=4 * inch)
            story.append(img)
            story.append(Spacer(1, 0.2 * inch))
            cover_added = True
        except Exception:
            pass

    # Text cover if no image — use blue header like compliance report
    if not cover_added:
        from reportlab.platypus import Table
        header_table = Table([[incident_id]], colWidths=[7 * inch])
        header_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#4f46e5")),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 22),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 20),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
        ]))
        story.append(header_table)
        from datetime import datetime
        gen_str = f"Generated {datetime.now().strftime('%m/%d/%Y, %I:%M:%S %p')} | Nova Sentinel"
        story.append(Paragraph(
            gen_str,
            ParagraphStyle("Sub", parent=styles["Normal"], fontSize=10, alignment=TA_CENTER, textColor=colors.HexColor("#64748b"))
        ))
        story.append(Spacer(1, 0.5 * inch))

    story.append(PageBreak())

    # Blue header for report body (align with compliance report)
    hdr_table = Table([["Security Incident Report"]], colWidths=[7.5 * inch])
    hdr_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#4f46e5")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 18),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("LEFTPADDING", (0, 0), (-1, -1), 20),
    ]))
    story.append(hdr_table)
    story.append(Spacer(1, 0.4 * inch))

    # Body styles
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, leading=14)
    h2_style = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=14, spaceBefore=16, spaceAfter=8, textColor=colors.HexColor("#0f172a"))
    h3_style = ParagraphStyle("H3", parent=styles["Heading3"], fontSize=12, spaceBefore=12, spaceAfter=6, textColor=colors.HexColor("#334155"))

    lines = markdown.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if not stripped:
            story.append(Spacer(1, 0.1 * inch))
            i += 1
            continue
        escaped = stripped.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        if stripped.startswith("# ") and i < 3:  # skip title if we have header
            i += 1
            continue
        if stripped.startswith("# "):
            story.append(Paragraph(escaped[2:], styles["Heading1"]))
        elif stripped.startswith("## "):
            story.append(Paragraph(escaped[3:], h2_style))
        elif stripped.startswith("### "):
            story.append(Paragraph(escaped[4:], h3_style))
        elif stripped.startswith("---"):
            i += 1
            continue
        elif stripped.startswith("|"):
            # Collect table rows (skip separator --- rows)
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                parts = [c.strip() for c in lines[i].strip().split("|") if c.strip()]
                is_sep = parts and all(set(p.replace(" ", "")) <= {"-"} for p in parts)
                if parts and not is_sep:
                    rows.append(parts)
                i += 1
            if rows:
                ncol = max(len(r) for r in rows) if rows else 1
                t = Table(rows, colWidths=[inch * 1.4] * ncol)
                t.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3730a3")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ]))
                story.append(t)
            continue
        elif stripped.startswith("- ") or stripped.startswith("* "):
            story.append(Paragraph("• " + escaped[2:].replace("**", "<b>", 1).replace("**", "</b>", 1) if "**" in escaped else escaped[2:], body_style))
        else:
            story.append(Paragraph(escaped.replace("**", "<b>", 1).replace("**", "</b>", 1) if "**" in escaped else escaped, body_style))
        i += 1

    doc.build(story)
    return buffer.getvalue()


@router.post("/export-pdf")
async def export_pdf(req: ExportPdfRequest) -> StreamingResponse:
    """Generate and return PDF report."""
    try:
        pdf_bytes = _render_pdf(req.incident_id, req.markdown, req.cover_image_base64)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="nova-sentinel-report-{req.incident_id}.pdf"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
