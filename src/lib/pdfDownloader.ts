import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Captures an HTML element and saves it as a high-resolution, multi-page A4 PDF file.
 * Enforces desktop A4 width (1024px) so that mobile devices produce the exact same
 * pristine corporate letterhead layout as desktop.
 */
export async function downloadElementAsPdf(elementId: string, fileName: string): Promise<boolean> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`[pdfDownloader] Element #${elementId} not found`);
      return false;
    }

    // Scroll to top to ensure complete render
    const originalScrollY = window.scrollY;
    window.scrollTo(0, 0);

    const canvas = await html2canvas(element, {
      scale: 2, // 2x High-DPI Retina resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1024, // Enforces standard A4 desktop width even on mobile screens
      onclone: (clonedDoc) => {
        const clonedEl = clonedDoc.getElementById(elementId);
        if (clonedEl) {
          clonedEl.style.width = '1024px';
          clonedEl.style.maxWidth = '1024px';
          clonedEl.style.margin = '0 auto';
          clonedEl.style.padding = '32px 40px';
          clonedEl.style.borderRadius = '0';
          clonedEl.style.boxShadow = 'none';
        }
      },
    });

    window.scrollTo(0, originalScrollY);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfPageHeight = pdf.internal.pageSize.getHeight();
    const elementHeightInPdf = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = elementHeightInPdf;
    let position = 0;

    // First Page
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, elementHeightInPdf, undefined, 'FAST');
    heightLeft -= pdfPageHeight;

    // Subsequent Pages if content extends beyond 1 page
    while (heightLeft > 5) {
      position = -(elementHeightInPdf - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, elementHeightInPdf, undefined, 'FAST');
      heightLeft -= pdfPageHeight;
    }

    const cleanName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    pdf.save(cleanName);
    return true;
  } catch (err) {
    console.error('[pdfDownloader] Failed to generate PDF:', err);
    // Fallback to native window.print() if canvas fails
    if (typeof window !== 'undefined') {
      window.print();
    }
    return false;
  }
}
