# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        # Preceptoria as a family reads it: what the school has published about their children.
        #
        # There is no draft here and no way to reach one — the policy scope is what enforces that,
        # so a guardian guessing an id finds nothing rather than something unfinished.
        class PreceptorshipReportsController < BaseController
          include PreceptorshipPdfDelivery

          def index
            authorize PreceptorshipReport

            reports = policy_scope(PreceptorshipReport)
                      .includes(:student, :teacher, :academic_period)
                      .order(published_at: :desc)
            pagy, records = pagy(reports)

            render json: {
              data: PreceptorshipReportBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            report = find_report
            authorize report

            render json: { data: PreceptorshipReportBlueprint.render_as_hash(report) }
          end

          # What the family keeps: the report as a document they can print or forward.
          def pdf
            report = find_report
            authorize report, :pdf?

            send_report_pdf(report)
          end

          private

          def find_report
            policy_scope(PreceptorshipReport).find(params[:id])
          end
        end
      end
    end
  end
end
