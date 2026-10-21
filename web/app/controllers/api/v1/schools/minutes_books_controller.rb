# frozen_string_literal: true

module Api
  module V1
    module Schools
      # Livro Ata books (BR-LA01) — yearly containers of minutes. Restricted to the director,
      # coordination and secretary role templates.
      class MinutesBooksController < BaseController
        before_action { authorize MinutesBook, :index? }

        def index
          return invalid_year if params[:year].present? && year_filter.nil?

          books = policy_scope(MinutesBook).ordered
          books = books.for_year(year_filter) if params[:year].present?

          pagy, records = pagy(books)

          render json: {
            data: MinutesBookBlueprint.render_as_hash(records, entry_counts: entry_counts_for(records)),
            meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
          }
        end

        def create
          authorize MinutesBook

          result = ::Minutes::CreateBookService.call(
            school: Current.school, params: book_params, membership: Current.membership
          )

          render_service_result(result) do |book|
            render json: { data: MinutesBookBlueprint.render_as_hash(book) }, status: :created
          end
        end

        private

        def book_params
          params.require(:minutes_book).permit(:name, :year)
        end

        def year_filter
          Integer(params[:year], 10, exception: false)
        end

        def invalid_year
          render_error(:validation_error, status: :unprocessable_content,
                                          details: { year: [ I18n.t("errors.messages.invalid") ] })
        end

        def entry_counts_for(books)
          policy_scope(MinutesEntry).where(minutes_book_id: books.map(&:id)).group(:minutes_book_id).count
        end
      end
    end
  end
end
