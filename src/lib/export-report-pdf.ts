/**
 * Opens a print dialog for the given element's content, styled for PDF output.
 * Uses the browser's native renderer which handles all modern CSS (lab(), oklch(), etc.)
 * that third-party canvas libraries choke on.
 */
export async function exportReportPdf(element: HTMLElement, _filename: string) {
  // Clone the element into a hidden iframe so we get a clean print context
  // without affecting the main page layout
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '800px';
  iframe.style.height = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  // Copy all stylesheets from the parent document
  const styleSheets: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (sheet.href) {
        styleSheets.push(`<link rel="stylesheet" href="${sheet.href}" />`);
      } else {
        const rules = Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
        styleSheets.push(`<style>${rules}</style>`);
      }
    } catch {
      // Cross-origin stylesheets — link them instead
      if (sheet.href) {
        styleSheets.push(`<link rel="stylesheet" href="${sheet.href}" />`);
      }
    }
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  ${styleSheets.join('\n')}
  <style>
    @media print {
      body { margin: 0; padding: 24px; }
      @page { margin: 16mm; size: A4; }
    }
    /* Reset the scrollable container to flow naturally for print */
    body > div { height: auto !important; overflow: visible !important; }
  </style>
</head>
<body>
  <div>${element.innerHTML}</div>
</body>
</html>`);
  doc.close();

  // Wait for stylesheets + fonts to load
  await new Promise((resolve) => {
    iframe.onload = resolve;
    setTimeout(resolve, 2000); // safety fallback
  });

  iframe.contentWindow?.print();

  // Clean up after a short delay (print dialog is blocking on most browsers)
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 1000);
}
