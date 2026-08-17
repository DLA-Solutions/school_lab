/** Mirrors `ServiceInvoiceBlueprint`. */
export type ServiceInvoiceStatus =
  | 'pending'
  | 'enqueued'
  | 'authorized'
  | 'rejected'
  | 'failed'
  | 'canceled';

export interface ServiceInvoice {
  id: number;
  status: ServiceInvoiceStatus;
  integration_id: string;
  provider: string;
  provider_document_id: string | null;
  invoice_number: string | null;
  verification_code: string | null;
  access_key: string | null;
  payment_id: number;
  charge_id: number;
  authorized_at: string | null;
  enqueued_at: string | null;
  failed_at: string | null;
  pdf_available: boolean;
}
