import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Captures an HTML element and saves it as a high-resolution, multi-page A4 PDF file.
 * Enforces desktop A4 width (1024px) so that mobile devices produce the exact same
 * pristine corporate letterhead layout as desktop.
 */
export async function downloadElementAsPdf(elementId: string, fileName: string): Promise<boolean> {
  try {
    const container = document.getElementById(elementId);
    if (!container) {
      console.error(`[pdfDownloader] Element #${elementId} not found`);
      return false;
    }

    // Scroll to top to ensure complete render
    const originalScrollY = window.scrollY;
    window.scrollTo(0, 0);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Check if the document has explicit page containers (.pdf-page)
    const pageElements = Array.from(container.querySelectorAll<HTMLElement>('.pdf-page'));

    if (pageElements.length > 0) {
      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2, // 2x Retina resolution
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1024,
          onclone: (clonedDoc) => {
            const allPages = clonedDoc.querySelectorAll<HTMLElement>('.pdf-page');
            allPages.forEach((p) => {
              p.style.width = '1024px';
              p.style.maxWidth = '1024px';
              p.style.minHeight = '1448px';
              p.style.boxSizing = 'border-box';
              p.style.margin = '0 auto';
              p.style.padding = '36px 42px';
              p.style.borderRadius = '0';
              p.style.boxShadow = 'none';
              p.style.border = 'none';
              p.style.display = 'flex';
              p.style.flexDirection = 'column';
              p.style.justifyContent = 'space-between';
            });
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.96);
        if (i > 0) {
          pdf.addPage();
        }

        // Exact A4 fit (1024px / 1448px matches A4 ratio 210mm / 297mm)
        const renderedHeight = (canvas.height * pdfWidth) / canvas.width;
        if (renderedHeight <= pdfHeight + 2) {
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        } else {
          // If content exceeded, fit proportionally
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, renderedHeight, undefined, 'FAST');
        }
      }

      window.scrollTo(0, originalScrollY);
      const cleanName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
      pdf.save(cleanName);
      return true;
    }

    // Fallback if no .pdf-page elements found: single element continuous render
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1024,
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
    const elementHeightInPdf = (canvas.height * pdfWidth) / canvas.width;
    let heightLeft = elementHeightInPdf;
    let position = 0;

    // First Page
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, elementHeightInPdf, undefined, 'FAST');
    heightLeft -= pdfHeight;

    // Subsequent Pages
    while (heightLeft > 5) {
      position = -(elementHeightInPdf - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, elementHeightInPdf, undefined, 'FAST');
      heightLeft -= pdfHeight;
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
