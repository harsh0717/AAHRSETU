import QRCode from 'qrcode';

/**
 * Generates an SVG string representation of a genuine QR code for verification deep-linking.
 */
export async function generateInvoiceQRCodeSVG(invoiceNo: string, size = 96): Promise<string> {
  const verifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify/invoice/${invoiceNo}`
    : `https://aharsetu.onrender.com/verify/invoice/${invoiceNo}`;

  return await QRCode.toString(verifyUrl, { type: 'svg', width: size, margin: 1 });
}

/**
 * Generates a base64 Data URL (SVG format) for genuine QR code.
 */
export async function generateInvoiceQRCodeDataURL(invoiceNo: string, size = 120): Promise<string> {
  const verifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify/invoice/${invoiceNo}`
    : `https://aharsetu.onrender.com/verify/invoice/${invoiceNo}`;

  return await QRCode.toDataURL(verifyUrl, { width: size, margin: 1 });
}

/**
 * Renders QR to a genuine PNG base64 Data URL.
 * Specifically formatted for jsPDF doc.addImage compatibility.
 */
export async function generateInvoiceQRCodePNGDataURL(invoiceNo: string, size = 200): Promise<string> {
  const verifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify/invoice/${invoiceNo}`
    : `https://aharsetu.onrender.com/verify/invoice/${invoiceNo}`;

  return await QRCode.toDataURL(verifyUrl, { width: size, margin: 1 });
}
