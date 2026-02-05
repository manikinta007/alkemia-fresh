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
    const logoSize = 20; // 20mm square
    const logoPosition = settings?.logo_position || 'left';
    const logo2Position = settings?.logo_2_position || 'right';
    const nameAlign = settings?.school_name_align || 'center';
    const addressAlign = settings?.school_address_align || 'center';

    // Helper to get X position based on alignment
    const getTextX = (textWidth, align) => {
        if (align === 'left') return margin + (logoPosition === 'left' && settings?.school_logo_url ? logoSize + 5 : 0);
        if (align === 'right') return pageWidth - margin - textWidth - (logo2Position === 'right' && settings?.school_logo_2_url ? logoSize + 5 : 0);
        return (pageWidth - textWidth) / 2; // center
    };

    // Logo at top position (centered above text)
    if (logoPosition === 'top' && settings?.school_logo_url) {
        try {
            const logoBase64 = await imageToBase64(settings.school_logo_url);
            if (logoBase64) {
                doc.addImage(logoBase64, 'PNG', (pageWidth - logoSize) / 2, currentY, logoSize, logoSize);
                currentY += logoSize + 3;
            }
        } catch (e) {
            console.error('Failed to add logo:', e);
        }
    }

    // Logo 1 (Left position)
    if (logoPosition === 'left' && settings?.school_logo_url) {
        try {
            const logoBase64 = await imageToBase64(settings.school_logo_url);
            if (logoBase64) {
                doc.addImage(logoBase64, 'PNG', margin, currentY, logoSize, logoSize);
            }
        } catch (e) {
            console.error('Failed to add logo:', e);
        }
    }

    // Logo 1 (Right position)
    if (logoPosition === 'right' && settings?.school_logo_url) {
        try {
            const logoBase64 = await imageToBase64(settings.school_logo_url);
            if (logoBase64) {
                doc.addImage(logoBase64, 'PNG', pageWidth - margin - logoSize, currentY, logoSize, logoSize);
            }
        } catch (e) {
            console.error('Failed to add logo:', e);
        }
    }

    // Logo 2 (if exists)
    if (settings?.school_logo_2_url && logo2Position) {
        try {
            const logo2Base64 = await imageToBase64(settings.school_logo_2_url);
            if (logo2Base64) {
                let logo2X = margin;
                let logo2Y = currentY;
                if (logo2Position === 'right') logo2X = pageWidth - margin - logoSize;
                else if (logo2Position === 'left') logo2X = margin;
                else if (logo2Position === 'top') {
                    logo2X = (pageWidth - logoSize) / 2 + logoSize + 5;
                    logo2Y = margin;
                } else if (logo2Position === 'bottom') {
                    logo2Y = currentY + logoSize + 25; // Below the header
                }
                doc.addImage(logo2Base64, 'PNG', logo2X, logo2Y, logoSize, logoSize);
            }
        } catch (e) {
            console.error('Failed to add logo 2:', e);
        }
    }

    // School Name
    if (settings?.school_name) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const textWidth = doc.getTextWidth(settings.school_name);
        const textX = getTextX(textWidth, nameAlign);
        doc.text(settings.school_name, textX, currentY + 8);
    }

    // School Address
    if (settings?.school_address) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const textWidth = doc.getTextWidth(settings.school_address);
        const textX = getTextX(textWidth, addressAlign);
        doc.text(settings.school_address, textX, currentY + 16);
    }

    // Adjust Y after header
    currentY = margin + logoSize + 8;

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
    if (finalY + 50 > pageHeight - 20) {
        doc.addPage();
        currentY = margin;
    } else {
        currentY = finalY;
    }

    // Signature Section (Right Aligned)
    const signatureX = pageWidth - margin - 70;

    // Place and Date
    const place = settings?.signature_place || 'Jakarta';
    const dateText = settings?.signature_date || formatDateID(new Date().toISOString().split('T')[0]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${place}, ${dateText}`, signatureX, currentY);
    currentY += 5;

    // Signature Image (if exists)
    if (settings?.signature_image_url) {
        try {
            const signatureBase64 = await imageToBase64(settings.signature_image_url);
            if (signatureBase64) {
                // Signature image: 40mm wide, 20mm height
                doc.addImage(signatureBase64, 'PNG', signatureX, currentY + 2, 40, 20);
            }
        } catch (e) {
            console.error('Failed to add signature image:', e);
        }
    }

    // Name (after signature space)
    if (settings?.signature_name) {
        doc.setFont('helvetica', 'bold');
        doc.text(settings.signature_name, signatureX, currentY + 28);
    }

    // NIP
    if (settings?.signature_nip) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`NIP: ${settings.signature_nip}`, signatureX, currentY + 33);
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
