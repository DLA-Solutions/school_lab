# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        class ServiceInvoicesController < BaseController
          def index
            authorize ServiceInvoice

            invoices = policy_scope(ServiceInvoice).order(created_at: :desc)
            pagy, records = pagy(invoices)
            render json: {
              data: ServiceInvoiceBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def pdf
            invoice = policy_scope(ServiceInvoice).find(params[:id])
            authorize invoice, :pdf?

            return render_error(:not_found, status: :not_found) unless invoice.pdf.attached?

            send_data invoice.pdf.download,
                      filename: "nfse-#{invoice.id}.pdf",
                      type: "application/pdf",
                      disposition: "inline"
          end
        end
      end
    end
  end
end
