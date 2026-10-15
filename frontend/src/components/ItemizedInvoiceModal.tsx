import React from 'react';
import { X, Printer, ShieldCheck, Download, CheckCircle2, FileText } from 'lucide-react';
import { DEFAULT_SERVICES } from '@/lib/api';
import { resolveBookingBilling } from '@/lib/billing';

interface ItemizedInvoiceModalProps {
  booking?: any;
  receipt?: any;
  customerUser?: any;
  onClose: () => void;
}

export const ItemizedInvoiceModal: React.FC<ItemizedInvoiceModalProps> = ({
  booking: rawBooking,
  receipt,
  customerUser,
  onClose
}) => {
  const item = receipt || rawBooking;
  if (!item) return null;

  const invoiceNo = item.invoice_no || item.invoiceNo || (item.booking_code ? `INV-MUD-${item.booking_code.toUpperCase()}` : (item.id?.startsWith('INV-') || item.id?.startsWith('RCP-') ? item.id : `INV-MUD-${(item.bookingId ? item.bookingId.slice(-6) : item.id ? item.id.slice(-6) : 'ORDER').toUpperCase()}`));
  const invoiceDate = new Date(item.paidAt || item.paid_at || item.created_at || Date.now()).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const validUntilDate = item.warrantyValidUntil || item.warranty_valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const customerName = item.customerName || item.customer_name || item.customer?.name || customerUser?.name || 'Verified Customer';
  const customerEmail = item.customerEmail || item.customer_email || item.customer?.email || customerUser?.email || 'customer@solvo.app';
  const customerPhone = item.customerPhone || item.customer_phone || item.customer?.phone || customerUser?.phone || '9845123456';
  const providerName = item.technicianName || item.technician_name || item.provider?.name || 'Manjunath K (Verified Pro)';
  const providerPhone = item.technicianPhone || item.technician_phone || item.provider?.phone || '9844011223';
  const providerKyc = item.provider?.profile?.aadhaar_number || 'XXXX-XXXX-4821';

  // Universal Billing Engine: guarantees Base Fare + Extra Materials = Total
  const {
    baseAmount,
    partsAmount,
    subtotal,
    discount,
    total,
    partsDescription: partsDesc,
    serviceDisplayName,
    itemsRepaired
  } = resolveBookingBilling(item);

  const gst = item.gstAmount || item.gst_amount || Math.round(baseAmount * 0.20 * 0.18);
  const cgst = (gst / 2).toFixed(2);
  const sgst = (gst / 2).toFixed(2);

  const paymentMethod = item.paymentMethod || item.payment_method || 'Official Escrow Gateway';
  const txnId = item.paymentTransactionId || item.payment_transaction_id || `pay_${(item.bookingId || item.id || '').slice(-8)}`;

  const handlePrint = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const printableElement = document.getElementById('printable-single-invoice') || document.getElementById('printable-invoice');
    if (!printableElement) {
      window.print();
      return;
    }

    const previousTitle = document.title;
    document.title = `Invoice-${invoiceNo}`;

    // Create a dedicated, clean, hidden iframe to strictly isolate this single invoice from the background page
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <title>Invoice-${invoiceNo}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 12mm 15mm;
              }
              * {
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                margin: 0;
                padding: 0;
                background: #ffffff;
                color: #0f172a;
              }
              .no-print {
                display: none !important;
              }
            </style>
          </head>
          <body>
            ${printableElement.outerHTML}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Isolated print failed, falling back to window.print', e);
          window.print();
        } finally {
          document.title = previousTitle;
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }
      }, 300);
    } else {
      window.print();
      document.title = previousTitle;
    }
  };

  const handleDownload = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const printableElement = document.getElementById('printable-single-invoice') || document.getElementById('printable-invoice');
    if (!printableElement) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice-${invoiceNo} - SOLVO</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 24px;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .invoice-wrapper {
      max-width: 720px;
      width: 100%;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      padding: 32px;
      border: 1px solid #e2e8f0;
    }
    .download-bar {
      max-width: 720px;
      width: 100%;
      display: flex;
      justifyContent: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 10px 16px;
      background: #0f172a;
      color: #ffffff;
      border-radius: 8px;
    }
    .print-btn {
      background: #2563eb;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
    }
    .print-btn:hover {
      background: #1d4ed8;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .download-bar {
        display: none !important;
      }
      .invoice-wrapper {
        box-shadow: none;
        border: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="download-bar">
    <span><strong>SOLVO Official Tax Invoice</strong> • ${invoiceNo}</span>
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="invoice-wrapper">
    ${printableElement.innerHTML}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice-${invoiceNo}.html`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 300);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Scoped CSS for print isolation ensuring ONLY this single invoice prints */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-single-invoice,
          #printable-single-invoice * {
            visibility: visible !important;
          }
          #printable-single-invoice {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            z-index: 999999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .modal-overlay,
          .modal-card {
            position: static !important;
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .no-print,
          .modal-control-bar,
          button {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="modal-card"
        style={{
          maxWidth: 680,
          backgroundColor: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div
          className="modal-control-bar no-print"
          style={{
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="#60a5fa" />
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>GST Tax Invoice & Warranty Card — SOLVO</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleDownload}
              data-testid="download-single-invoice-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
              title="Download single customer invoice file"
            >
              <Download size={14} />
              <span>Download Invoice</span>
            </button>
            <button
              onClick={handlePrint}
              data-testid="print-single-invoice-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
              title="Print or Save single selected invoice as PDF"
            >
              <Printer size={14} />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 4
              }}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container — Strictly Scoped to Single Selected Order */}
        <div id="printable-single-invoice" data-testid="printable-single-invoice" style={{ padding: '28px 32px' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: 20,
            marginBottom: 20
          }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
                SOL<span style={{ color: '#2563eb' }}>VO</span>
              </h2>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                SOLVO<br />
                GSTIN: <strong>29AAACM1928K1Z5</strong> • SAC: 9987<br />
                Karnataka, India • support@solvo.app
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{
                display: 'inline-block',
                padding: '3px 10px',
                borderRadius: 6,
                backgroundColor: '#dcfce7',
                color: '#15803d',
                fontWeight: 800,
                fontSize: '0.75rem',
                marginBottom: 4
              }}>
                TAX INVOICE (PAID)
              </span>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                {invoiceNo}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Date: {invoiceDate}
              </div>
            </div>
          </div>

          {/* Customer & Technician Details Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            padding: '16px',
            marginBottom: 24,
            border: '1px solid #e2e8f0'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>
                Customer Details
              </div>
              <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                {customerName}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 2 }}>
                📱 Mobile: +91 {customerPhone}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 1 }}>
                ✉️ Email: {customerEmail}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                📍 {item.customerAddress || item.address_locality || 'Sagara, Karnataka 577401'}
              </div>
              {item.address_text && (
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {item.address_text}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>
                Fulfillment Partner Details
              </div>
              <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                {providerName}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 2 }}>
                🔧 Contact: +91 {providerPhone}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={14} />
                <span>Govt Aadhaar KYC: {providerKyc}</span>
              </div>
            </div>
          </div>

          {/* Itemized Services & Spare Parts Table */}
          <div style={{ marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '10px 8px', fontWeight: 800 }}>Item / Service Description</th>
                  <th style={{ padding: '10px 8px', fontWeight: 800, textAlign: 'center' }}>Type</th>
                  <th style={{ padding: '10px 8px', fontWeight: 800, textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '10px 8px', fontWeight: 800, textAlign: 'right' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {/* Labor / Inspection */}
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {serviceDisplayName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                      Standard service labor charge, doorstep diagnosis, and execution
                    </div>
                    {itemsRepaired && itemsRepaired.length > 0 && (
                      <div style={{ fontSize: '0.72rem', color: '#4338ca', marginTop: 4, backgroundColor: '#eef2ff', padding: '4px 8px', borderRadius: 6 }}>
                        <strong>Items Repaired:</strong> {itemsRepaired.join(' • ')}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', color: '#2563eb', fontWeight: 600, fontSize: '0.75rem' }}>
                    Labor
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', color: '#475569' }}>1</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                    ₹{baseAmount}
                  </td>
                </tr>

                {/* Newly Added Spare Parts */}
                {partsAmount > 0 && (
                  <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fefce8' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: 700, color: '#854d0e' }}>
                        Newly Added Spare Parts & Materials
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#a16207', marginTop: 2 }}>
                        {partsDesc}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', color: '#d97706', fontWeight: 600, fontSize: '0.75rem' }}>
                      Materials
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', color: '#475569' }}>1</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#854d0e' }}>
                      ₹{partsAmount}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Tax Calculation & Totals Summary (Platform commission completely removed) */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 20
          }}>
            <div style={{ width: 280, fontSize: '0.82rem', display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Subtotal (Labor + Parts):</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{subtotal}</span>
              </div>

              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                  <span>Discount Applied:</span>
                  <span style={{ fontWeight: 700 }}>-₹{discount}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>CGST (9% Incl.):</span>
                <span>₹{cgst}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>SGST (9% Incl.):</span>
                <span>₹{sgst}</span>
              </div>

              <div style={{
                borderTop: '2px solid #0f172a',
                paddingTop: 8,
                marginTop: 4,
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 800,
                fontSize: '1.1rem',
                color: '#0f172a'
              }}>
                <span>Total Amount Paid:</span>
                <span style={{ color: '#2563eb' }}>₹{total}</span>
              </div>
            </div>
          </div>

          {/* 30-Day Free Rework Warranty & Protection Card */}
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={24} color="#16a34a" />
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#166534' }}>
                  30-Day Free Rework Warranty Active
                </div>
                <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: 2 }}>
                  Protected by SOLVO Escrow • Valid until {validUntilDate}
                </div>
              </div>
            </div>
            <span style={{
              backgroundColor: '#dcfce7',
              color: '#166534',
              fontWeight: 800,
              fontSize: '0.72rem',
              padding: '4px 10px',
              borderRadius: 6
            }}>
              WARRANTY ACTIVE
            </span>
          </div>

          {/* Payment & Security Footer */}
          <div style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#64748b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>Paid via {paymentMethod} • Ref: <strong>{txnId}</strong></span>
            </div>
            <div>
              Single Order Receipt • Digital Doorstep Service Receipt
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
