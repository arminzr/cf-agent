// ─────────────────────────────────────────────────
// QR Code Generator — goqr.me (free, no API key)
// ─────────────────────────────────────────────────

export async function qrCode(data: string): Promise<any> {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
  return { url, data };
}
