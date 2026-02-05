import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Convert image URL to base64 data URL
 */
const imageToBase64 = async (url) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error('Failed to load image:', e);
        return null;
    }
};

/**
 * Generate PDF for Journal Export
 * @param {Object} params
 * @param {Array} params.journals - Array of journal entries
 * @param {Object} params.settings - Journal settings (school info, signature)
 * @param {Object} params.template - Active template with columns
 * @param {string} params.className - Name of the class
 * @param {string} params.monthLabel - Month label for filename
 */
export const generateJournalPDF = async ({ journals, settings, template, className, monthLabel }) => {
    // Create PDF document
    const orientation = settings?.pdf_orientation || 'landscape';
    const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // ==========================================
    // 1. RENDER KOP SURAT (HEADER)
    // ==========================================
    let currentY = margin;

    // School Logo (if exists)
    let logoWidth = 0;
    if (settings?.school_logo_url) {
        try {
            const logoBase64 = await imageToBase64(settings.school_logo_url);
            if (logoBase64) {
                const logoSize = 20; // 20mm square
                doc.addImage(logoBase64, 'PNG', margin, currentY, logoSize, logoSize);
                logoWidth = logoSize + 5; // Add some spacing
            }
        } catch (e) {
            console.error('Failed to add logo to PDF:', e);
        }
    }

    // School Name (Bold, Centered or next to logo)
    if (settings?.school_name) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        if (logoWidth > 0) {
            // Text next to logo
            doc.text(settings.school_name, margin + logoWidth, currentY + 8);
        } else {
            // Centered text
            const schoolNameWidth = doc.getTextWidth(settings.school_name);
            doc.text(settings.school_name, (pageWidth - schoolNameWidth) / 2, currentY);
        }
        currentY += 7;
    }

    // School Address (Normal, Centered or next to logo)
    if (settings?.school_address) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (logoWidth > 0) {
            // Text next to logo
            doc.text(settings.school_address, margin + logoWidth, currentY + 8);
        } else {
            // Centered text
            const addressWidth = doc.getTextWidth(settings.school_address);
            doc.text(settings.school_address, (pageWidth - addressWidth) / 2, currentY);
        }
        currentY += 5;
    }

    // Adjust Y if logo was taller
    if (logoWidth > 0) {
        currentY = margin + 25; // Logo height + spacing
    }

    // Horizontal Line
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    // Title: JURNAL MENGAJAR
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const titleWidth = doc.getTextWidth('JURNAL MENGAJAR');
    doc.text('JURNAL MENGAJAR', (pageWidth - titleWidth) / 2, currentY);
    currentY += 5;

    // Class and Period Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const infoText = `Kelas: ${className} | Periode: ${monthLabel}`;
    const infoWidth = doc.getTextWidth(infoText);
    doc.text(infoText, (pageWidth - infoWidth) / 2, currentY);
    currentY += 10;

    // ==========================================
    // 2. GENERATE TABLE
    // ==========================================
    const templateConfig = template?.template_config || [];

    // Table Headers
    const headers = [
        'No',
        'Tanggal',
        'Jam',
        ...templateConfig.map(f => f.label)
    ];

    // Table Body
    const body = journals.map((journal, idx) => {
        const customData = journal.custom_data || {};
        const timeRange = journal.start_time && journal.end_time
            ? `${journal.start_time}-${journal.end_time}`
            : '-';

        return [
            idx + 1,
            formatDateID(journal.date),
            timeRange,
            ...templateConfig.map(f => {
                let value = customData[f.key] || '-';
                // Truncate long text for readability
                if (typeof value === 'string' && value.length > 100) {
                    value = value.substring(0, 97) + '...';
                }
                return value;
            })
        ];
    });

    // AutoTable Configuration
    autoTable(doc, {
        head: [headers],
        body: body,
        startY: currentY,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
            fillColor: [255, 124, 0], // Orange
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'center'
        },
        bodyStyles: {
            fontSize: 8,
            cellPadding: 3
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' }, // No
            1: { cellWidth: 25, halign: 'center' }, // Date
            2: { cellWidth: 20, halign: 'center' }  // Time
        },
        didDrawPage: (data) => {
            // Footer on each page
            const footerY = pageHeight - 10;
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('Dicetak dari AlkeMia Learning System', margin, footerY);
            doc.text(`Halaman ${doc.internal.getNumberOfPages()}`, pageWidth - margin - 20, footerY);
        }
    });

    // ==========================================
    // 3. SIGNATURE (Only on last page)
    // ==========================================
    const finalY = (doc.lastAutoTable?.finalY || currentY) + 15;

    // Check if signature fits, or add new page
    if (finalY + 30 > pageHeight - 20) {
        doc.addPage();
        currentY = margin;
    } else {
        currentY = finalY;
    }

    // Signature Section (Right Aligned)
    const signatureX = pageWidth - margin - 60;
    const dateText = `${getCityName()}, ${formatDateID(new Date().toISOString().split('T')[0])}`;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(dateText, signatureX, currentY);
    currentY += 5;

    if (settings?.signature_name) {
        doc.text(settings.signature_name, signatureX, currentY + 20);
    }

    if (settings?.signature_nip) {
        doc.setFontSize(9);
        doc.text(`NIP: ${settings.signature_nip}`, signatureX, currentY + 25);
    }

    // ==========================================
    // 4. SAVE PDF
    // ==========================================
    const filename = `jurnal_${className.replace(/\s/g, '_')}_${monthLabel.replace(/\s/g, '_')}.pdf`;
    doc.save(filename);
};

// Helper: Format date to Indonesian locale
const formatDateID = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Helper: Get city name from school address (fallback to default)
const getCityName = () => {
    return 'Jakarta'; // Default, or parse from settings.school_address if needed
};
