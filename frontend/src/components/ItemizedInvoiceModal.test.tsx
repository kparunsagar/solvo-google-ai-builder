import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ItemizedInvoiceModal } from './ItemizedInvoiceModal';

const renderClean = (elem: React.ReactElement) => renderToString(elem).replace(/<!-- -->/g, '');

describe('ItemizedInvoiceModal Calculation & Pricing Engine', () => {
  it('correctly calculates total for 699 fee + 100 material = 799 (reconciling stale booking total_amount)', () => {
    const booking = {
      id: 'bk_1790346175773_1t3j',
      booking_code: '1T3J',
      price: 699,
      base_amount: 699,
      parts_materials_amount: 100,
      parts_cost: 100,
      total_price: 699,
      total_amount: 699,
      customer_name: 'urbanai',
      customer_phone: '9845123456',
      technician_name: 'SELF LEARNER',
      technician_phone: '8888888888',
      service_name: 'Doorstep Service & Inspection'
    };

    const html = renderClean(
      <ItemizedInvoiceModal booking={booking} onClose={() => {}} />
    );

    // Verify Labor and Materials rows
    expect(html).toContain('Doorstep Service &amp; Inspection');
    expect(html).toContain('₹699');
    expect(html).toContain('Newly Added Spare Parts &amp; Materials');
    expect(html).toContain('₹100');

    // Verify Subtotal (Labor + Parts) is ₹799
    expect(html).toContain('Subtotal (Labor + Parts):');
    expect(html).toContain('₹799');

    // Verify Total Amount Paid is ₹799 (NOT ₹699)
    expect(html).toContain('Total Amount Paid:');
    expect(html).toContain('<span style="color:#2563eb">₹799</span>');

    // Verify GST is marked as inclusive
    expect(html).toContain('CGST (9% Incl.):');
    expect(html).toContain('SGST (9% Incl.):');
  });

  it('correctly calculates total when no materials are added (0 materials)', () => {
    const booking = {
      id: 'bk_clean_service',
      price: 699,
      base_amount: 699,
      parts_materials_amount: 0,
      parts_cost: 0,
      total_amount: 699,
      total_price: 699
    };

    const html = renderClean(
      <ItemizedInvoiceModal booking={booking} onClose={() => {}} />
    );

    expect(html).toContain('Subtotal (Labor + Parts):');
    expect(html).toContain('₹699');
    expect(html).toContain('Total Amount Paid:');
    expect(html).toContain('<span style="color:#2563eb">₹699</span>');
    expect(html).not.toContain('Newly Added Spare Parts &amp; Materials');
  });

  it('sums multiple items from newlyAddedMaterials array', () => {
    const booking = {
      id: 'bk_multi_parts',
      price: 699,
      base_labor_amount: 699,
      newly_added_materials: [
        { name: 'Copper pipe elbow', amount: 150 },
        { name: 'Teflon sealing tape', amount: 50 }
      ],
      total_price: 699
    };

    const html = renderClean(
      <ItemizedInvoiceModal booking={booking} onClose={() => {}} />
    );

    // 699 + 150 + 50 = 899
    expect(html).toContain('Subtotal (Labor + Parts):');
    expect(html).toContain('₹899');
    expect(html).toContain('<span style="color:#2563eb">₹899</span>');
    expect(html).toContain('Copper pipe elbow (₹150), Teflon sealing tape (₹50)');
  });

  it('correctly deducts whistleblower / promo discount from total', () => {
    const booking = {
      id: 'bk_with_discount',
      price: 699,
      parts_cost: 100,
      whistleblower_discount: 140,
      total_price: 699
    };

    const html = renderClean(
      <ItemizedInvoiceModal booking={booking} onClose={() => {}} />
    );

    // Subtotal: 699 + 100 = 799
    // Total: 799 - 140 = 659
    expect(html).toContain('Subtotal (Labor + Parts):');
    expect(html).toContain('₹799');
    expect(html).toContain('Discount Applied:');
    expect(html).toContain('-₹140');
    expect(html).toContain('<span style="color:#2563eb">₹659</span>');
  });

  it('renders correctly when receipt entity is provided instead of booking', () => {
    const receipt = {
      id: 'RCP-MUD-TEST',
      baseLaborAmount: 699,
      partsMaterialsAmount: 100,
      totalAmountPaid: 799,
      newlyAddedMaterials: [{ description: 'Filter replacement', amount: 100 }]
    };

    const html = renderClean(
      <ItemizedInvoiceModal receipt={receipt} onClose={() => {}} />
    );

    expect(html).toContain('₹799');
    expect(html).toContain('<span style="color:#2563eb">₹799</span>');
  });

  it('derives base labor if only total is provided with parts (preventing missing base bug)', () => {
    const booking = {
      id: 'bk_already_updated_total',
      parts_materials_amount: 100,
      total_price: 799,
      total_amount: 799
    };

    const html = renderClean(
      <ItemizedInvoiceModal booking={booking} onClose={() => {}} />
    );

    // Base labor should be derived: 799 - 100 = 699
    expect(html).toContain('₹699');
    expect(html).toContain('₹100');
    expect(html).toContain('Subtotal (Labor + Parts):');
    expect(html).toContain('₹799');
    expect(html).toContain('Total Amount Paid:');
    expect(html).toContain('<span style="color:#2563eb">₹799</span>');
  });

  it('ignores stale GST surcharge recordedPaid (e.g. 824) and strictly enforces netDue 799', () => {
    const booking = {
      id: 'bk_stale_gst_surcharge',
      price: 699,
      base_amount: 699,
      parts_materials_amount: 100,
      total_price: 824, // old backend pricing with +25 GST
      total_amount: 824,
      amount_paid: 824
    };

    const html = renderClean(
      <ItemizedInvoiceModal booking={booking} onClose={() => {}} />
    );

    // Should strictly display ₹799, not ₹824
    expect(html).toContain('Subtotal (Labor + Parts):');
    expect(html).toContain('₹799');
    expect(html).toContain('Total Amount Paid:');
    expect(html).toContain('<span style="color:#2563eb">₹799</span>');
    expect(html).not.toContain('₹824');
  });

  it('strictly isolates the single selected invoice with dedicated printable container, print styles, and download button', () => {
    const booking = {
      id: 'bk_single_order_123',
      booking_code: 'ORDR99',
      price: 699,
      base_amount: 699,
      parts_cost: 100,
      customer_name: 'Aditi Rao',
      customer_phone: '9845199999',
      customer_email: 'aditi@example.com',
      technician_name: 'Kiran Kumar',
      technician_phone: '9844111111'
    };

    const html = renderClean(
      <ItemizedInvoiceModal booking={booking} onClose={() => {}} />
    );

    // Verify dedicated isolated container for single order exists
    expect(html).toContain('id="printable-single-invoice"');
    expect(html).toContain('data-testid="printable-single-invoice"');

    // Verify Download Invoice button exists
    expect(html).toContain('data-testid="download-single-invoice-btn"');
    expect(html).toContain('Download Invoice');

    // Verify Print / PDF button exists
    expect(html).toContain('data-testid="print-single-invoice-btn"');
    expect(html).toContain('Print / PDF');

    // Verify scoped @media print styles hide all background DOM elements
    expect(html).toContain('@media print');
    expect(html).toContain('visibility: hidden !important;');
    expect(html).toContain('#printable-single-invoice');

    // Verify invoice footer contains single order receipt confirmation
    expect(html).toContain('Single Order Receipt');

    // Verify selected order identity
    expect(html).toContain('INV-MUD-ORDR99');
    expect(html).toContain('Aditi Rao');
    expect(html).toContain('9845199999');
    expect(html).toContain('aditi@example.com');
  });

  it('strictly validates user pattern: base fare 499 + extra material 200 = total 699', () => {
    const booking = {
      id: 'bk_pipe_leak_499',
      booking_code: 'PL499',
      service_name: 'Pipe Leak Fix',
      price: 499,
      base_amount: 499,
      parts_cost: 200,
      parts_materials_amount: 200,
      total_price: 699,
      total_amount: 699,
      customer_name: 'Sagara Resident',
      technician_name: 'Manjunath K'
    };

    const html = renderClean(
      <ItemizedInvoiceModal booking={booking} onClose={() => {}} />
    );

    // Base fare: 499
    expect(html).toContain('Pipe Leak Fix');
    expect(html).toContain('₹499');

    // Extra material: 200
    expect(html).toContain('Newly Added Spare Parts &amp; Materials');
    expect(html).toContain('₹200');

    // Subtotal: 699
    expect(html).toContain('Subtotal (Labor + Parts):');
    expect(html).toContain('₹699');

    // Total: 699
    expect(html).toContain('Total Amount Paid:');
    expect(html).toContain('<span style="color:#2563eb">₹699</span>');
  });

  it('strictly preserves base fare 499 + extra material 200 = total 699 even if total_price in record is stale 499', () => {
    const booking = {
      id: 'bk_stale_total_499',
      price: 499,
      parts_cost: 200,
      total_price: 499 // total_price was not yet updated before payment completed
    };

    const html = renderClean(
      <ItemizedInvoiceModal booking={booking} onClose={() => {}} />
    );

    expect(html).toContain('₹499');
    expect(html).toContain('₹200');
    expect(html).toContain('Subtotal (Labor + Parts):');
    expect(html).toContain('₹699');
    expect(html).toContain('<span style="color:#2563eb">₹699</span>');
  });
});