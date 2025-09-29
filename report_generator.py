#!/usr/bin/env python3
"""
PDF Report Generator for Moving Consultation
Generates professional PDF reports from inventory data
"""

import json
import os
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

class MovingConsultationReport:
    def __init__(self, inventory_file="inventory.json"):
        self.inventory_file = inventory_file
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()
        
    def setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Title'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        ))
        
        # Room header style
        self.styles.add(ParagraphStyle(
            name='RoomHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            spaceBefore=20,
            textColor=colors.darkgreen,
            borderWidth=1,
            borderColor=colors.green,
            borderPadding=8
        ))
        
        # Item style
        self.styles.add(ParagraphStyle(
            name='ItemText',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=6,
            leftIndent=20
        ))
        
        # Notes style
        self.styles.add(ParagraphStyle(
            name='NotesText',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            leftIndent=20,
            textColor=colors.darkblue,
            fontName='Helvetica-Oblique'
        ))

    def load_inventory_data(self):
        """Load inventory data from JSON file"""
        try:
            if not os.path.exists(self.inventory_file):
                return None
                
            with open(self.inventory_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading inventory data: {e}")
            return None

    def calculate_room_totals(self, items):
        """Calculate totals for a room"""
        total_items = sum(item['qty'] for item in items.values())
        fragile_items = sum(item['qty'] for item in items.values() if item.get('fragile', False))
        large_items = sum(item['qty for item in items.values() if item.get('size') == 'large'])
        
        return {
            'total_items': total_items,
            'fragile_items': fragile_items,
            'large_items': large_items
        }

    def generate_room_section(self, room_name, items):
        """Generate a section for a specific room"""
        if not items:
            return [
                Paragraph(f"<b>{room_name.title()}</b>", self.styles['RoomHeader']),
                Paragraph("No items detected in this room.", self.styles['ItemText']),
                Spacer(1, 12)
            ]
        
        # Calculate room totals
        totals = self.calculate_room_totals(items)
        
        # Room header with totals
        room_header = f"<b>{room_name.title()}</b> - {totals['total_items']} items"
        if totals['fragile_items'] > 0:
            room_header += f" ({totals['fragile_items']} fragile)"
        
        elements = [
            Paragraph(room_header, self.styles['RoomHeader']),
        ]
        
        # Create items table
        table_data = [['Item', 'Quantity', 'Size', 'Fragile', 'Notes']]
        
        for item_name, details in items.items():
            fragile_text = "Yes" if details.get('fragile', False) else "No"
            size_text = details.get('size', 'medium').title()
            notes_text = "Handle with care" if details.get('fragile', False) else ""
            
            table_data.append([
                item_name.title(),
                str(details['qty']),
                size_text,
                fragile_text,
                notes_text
            ])
        
        # Create table
        table = Table(table_data, colWidths=[2*inch, 0.8*inch, 0.8*inch, 0.8*inch, 1.5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 12))
        
        return elements

    def generate_summary_section(self, inventory_data):
        """Generate summary section"""
        total_rooms = len(inventory_data.get('inventory', {}))
        total_items = sum(
            sum(item['qty'] for item in room_items.values())
            for room_items in inventory_data.get('inventory', {}).values()
        )
        
        fragile_items = sum(
            sum(item['qty'] for item in room_items.values() if item.get('fragile', False))
            for room_items in inventory_data.get('inventory', {}).values()
        )
        
        elements = [
            Paragraph("MOVING CONSULTATION SUMMARY", self.styles['CustomTitle']),
            Spacer(1, 20),
            
            # Summary table
            Table([
                ['Total Rooms', str(total_rooms)],
                ['Total Items', str(total_items)],
                ['Fragile Items', str(fragile_items)],
                ['Consultation Date', datetime.now().strftime('%Y-%m-%d %H:%M')],
            ], colWidths=[2*inch, 2*inch]),
            
            Spacer(1, 20),
        ]
        
        return elements

    def generate_notes_section(self, consultation_notes):
        """Generate consultation notes section"""
        if not consultation_notes:
            return []
        
        elements = [
            Paragraph("CONSULTATION NOTES", self.styles['Heading2']),
            Spacer(1, 12),
        ]
        
        for note in consultation_notes:
            elements.append(Paragraph(f"• {note}", self.styles['NotesText']))
        
        elements.append(Spacer(1, 20))
        return elements

    def generate_pdf(self, output_file="moving_consultation_report.pdf"):
        """Generate the complete PDF report"""
        try:
            # Load inventory data
            inventory_data = self.load_inventory_data()
            if not inventory_data:
                print("❌ No inventory data found. Run the agent first to generate inventory.")
                return False
            
            # Create PDF document
            doc = SimpleDocTemplate(output_file, pagesize=letter)
            elements = []
            
            # Generate sections
            elements.extend(self.generate_summary_section(inventory_data))
            
            # Generate room sections
            inventory = inventory_data.get('inventory', {})
            for room_name, items in inventory.items():
                elements.extend(self.generate_room_section(room_name, items))
            
            # Generate notes section
            consultation_notes = inventory_data.get('notes', [])
            elements.extend(self.generate_notes_section(consultation_notes))
            
            # Add footer
            elements.append(Spacer(1, 20))
            elements.append(Paragraph(
                f"Report generated on {datetime.now().strftime('%Y-%m-%d at %H:%M')} by Dave, AI Moving Consultant",
                self.styles['Normal']
            ))
            
            # Build PDF
            doc.build(elements)
            print(f"✅ PDF report generated: {output_file}")
            return True
            
        except Exception as e:
            print(f"❌ Error generating PDF: {e}")
            return False

def main():
    """Main function to generate report"""
    print("📄 Generating Moving Consultation Report...")
    
    report_generator = MovingConsultationReport()
    success = report_generator.generate_pdf()
    
    if success:
        print("🎉 Report generation completed successfully!")
        print("📋 The report includes:")
        print("  - Room-by-room inventory")
        print("  - Item details (quantity, size, fragility)")
        print("  - Consultation notes")
        print("  - Summary statistics")
    else:
        print("❌ Report generation failed. Check inventory.json file.")

if __name__ == "__main__":
    main()
