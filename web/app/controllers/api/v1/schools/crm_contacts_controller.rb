# frozen_string_literal: true

module Api
  module V1
    module Schools
      # Plain CRUD over a school's prospects: no rule beyond the model's validations, so no service
      # (docs/guidelines/web/anti-patterns.md, "service graveyard").
      class CrmContactsController < BaseController
        before_action :set_crm_contact, only: %i[show update destroy]

        def index
          authorize CrmContact

          if params[:temperature].present? && CrmContact::TEMPERATURES.exclude?(params[:temperature])
            return render_error(
              :validation_error,
              status: :unprocessable_content,
              details: { temperature: [ I18n.t("api.errors.crm_contact_invalid_temperature") ] }
            )
          end

          contacts = policy_scope(CrmContact).ordered
          contacts = contacts.with_temperature(params[:temperature]) if params[:temperature].present?
          contacts = contacts.search(params[:q]) if params[:q].present?

          pagy, records = pagy(contacts)

          render json: {
            data: CrmContactBlueprint.render_as_hash(records, view: :summary),
            meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
          }
        end

        def show
          authorize @crm_contact

          render json: { data: CrmContactBlueprint.render_as_hash(@crm_contact, view: :detail) }
        end

        def create
          authorize CrmContact

          save_and_render(Current.school.crm_contacts.build(crm_contact_params), status: :created)
        end

        def update
          authorize @crm_contact

          @crm_contact.assign_attributes(crm_contact_params)
          save_and_render(@crm_contact)
        end

        def destroy
          authorize @crm_contact

          @crm_contact.discard
          head :no_content
        end

        private

        # Found through the policy scope so a contact of another school (or a discarded one) is a
        # 404, never a 403 that would confirm it exists.
        def set_crm_contact
          @crm_contact = policy_scope(CrmContact).find(params[:id])
        end

        def save_and_render(contact, status: :ok)
          if contact.save
            render json: { data: CrmContactBlueprint.render_as_hash(contact, view: :detail) }, status: status
          else
            render_error(:validation_error, status: :unprocessable_content, details: contact.errors.to_hash)
          end
        end

        def crm_contact_params
          params.require(:crm_contact).permit(:name, :phone, :email, :notes, :temperature)
        end
      end
    end
  end
end
