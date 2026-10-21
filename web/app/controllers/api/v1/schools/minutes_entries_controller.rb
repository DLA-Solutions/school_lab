# frozen_string_literal: true

module Api
  module V1
    module Schools
      # Livro Ata entries (BR-LA02..BR-LA07). Thin: authorization here, every rule in
      # `app/services/minutes/`. Only the director, coordination and secretary role templates get
      # in; the role check runs before any lookup so a wrong role is a 403, while another school's
      # entry is a 404 through the policy scope.
      class MinutesEntriesController < BaseController
        before_action { authorize MinutesEntry, :index? }
        before_action :set_entry, only: %i[show update pdf send_for_signature cancel]

        def index
          entries = filter(policy_scope(MinutesEntry))
          return if performed?

          pagy, records = pagy(entries.includes(:minutes_book, :minutes_participants).newest_first)

          render json: {
            data: MinutesEntryBlueprint.render_as_hash(records, view: :summary),
            meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
          }
        end

        def show
          authorize @entry

          render_entry(@entry)
        end

        def create
          authorize MinutesEntry

          result = ::Minutes::CreateEntryService.call(
            school: Current.school, params: entry_params, participants: participants_params,
            membership: Current.membership
          )

          render_service_result(result) do |entry|
            render_entry(entry, status: :created)
          end
        end

        def update
          authorize @entry

          result = ::Minutes::UpdateEntryService.call(
            entry: @entry, params: update_params, participants: participants_params
          )

          render_service_result(result) { |entry| render_entry(entry) }
        end

        # The signed copy once signed, otherwise a fresh render of what is (or was) sent for signature.
        def pdf
          authorize @entry

          result = ::Minutes::DownloadPdfService.call(entry: @entry)
          return render_service_result(result) if result.failure?

          send_data result.data.fetch(:pdf),
                    filename: result.data.fetch(:filename),
                    type: "application/pdf",
                    disposition: "inline"
        end

        def send_for_signature
          authorize @entry

          result = ::Minutes::SendForSignatureService.call(entry: @entry, actor: Current.user)

          render_service_result(result) { |data| render_entry(data.fetch(:entry)) }
        end

        def cancel
          authorize @entry

          result = ::Minutes::CancelService.call(entry: @entry, actor: Current.user)

          render_service_result(result) { |entry| render_entry(entry) }
        end

        private

        # Found through the policy scope so another school's (or a discarded) ata is a 404.
        def set_entry
          @entry = policy_scope(MinutesEntry).find(params[:id])
        end

        def render_entry(entry, status: :ok)
          entry = MinutesEntry.includes(:minutes_book, :minutes_participants).find(entry.id)

          render json: { data: MinutesEntryBlueprint.render_as_hash(entry, view: :detail) }, status: status
        end

        # The provider being unavailable is a 502 for this domain (PRD § Errors), not the generic 422.
        def error_status_for(code)
          code.to_sym == :provider_error ? :bad_gateway : super
        end

        def filter(scope)
          scope = scope.for_book(params[:minutes_book_id]) if params[:minutes_book_id].present?
          scope = scope.with_participant_named(params[:q]) if params[:q].present?
          scope = filter_by_year(scope)
          scope = filter_by_enum(scope, :kind, MinutesEntry::KINDS, :of_kind)
          filter_by_enum(scope, :status, MinutesEntry::STATUSES, :with_status)
        end

        def filter_by_year(scope)
          return scope if params[:year].blank?

          year = Integer(params[:year], 10, exception: false)
          return invalid_filter(:year) if year.nil?

          scope.for_year(year)
        end

        def filter_by_enum(scope, key, allowed, scope_name)
          return scope if params[key].blank? || performed?
          return invalid_filter(key) unless allowed.include?(params[key])

          scope.public_send(scope_name, params[key])
        end

        def invalid_filter(key)
          render_error(:validation_error, status: :unprocessable_content,
                                          details: { key => [ I18n.t("errors.messages.inclusion") ] })
          nil
        end

        def entry_params
          params.require(:minutes_entry).permit(:minutes_book_id, :kind, :title, :held_on, :body,
                                                :school_class_id)
        end

        # `kind` is deliberately absent: it is fixed at creation (BR-LA02).
        def update_params
          params.require(:minutes_entry).permit(:minutes_book_id, :title, :held_on, :body, :school_class_id)
        end

        # nil when the key is absent, so an edit that does not mention participants leaves them alone.
        def participants_params
          root = params.require(:minutes_entry)
          return unless root.key?(:participants)

          root.permit(participants: %i[name role_label email cpf signs membership_id guardian_id student_id])
              .fetch(:participants, [])
        end
      end
    end
  end
end
