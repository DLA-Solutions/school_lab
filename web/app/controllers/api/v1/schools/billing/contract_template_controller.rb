# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        # The school's own agreement. Created on first read rather than by a separate step, so the
        # screen always has something to edit.
        class ContractTemplateController < BaseController
          def show
            template = find_or_build
            authorize template, :show?

            render json: { data: render_template(template) }
          end

          def update
            template = find_or_build
            authorize template, :update?

            template.assign_attributes(template_params)
            template.updated_by = Current.user
            attach_logo(template)

            if template.save
              render json: { data: render_template(template) }
            else
              render_error(:validation_error, status: :unprocessable_content,
                                              details: template.errors.to_hash)
            end
          end

          # Renders the agreement with a real contract's data when one exists, and with a made-up
          # one otherwise — so the school sees what a family will receive before sending anything.
          def preview
            template = find_or_build
            authorize template, :preview?

            contract = preview_contract
            return render_sample(template) if contract.blank?

            result = ::Contracts::FillTemplateService.call(contract: contract, template: template)

            if result.success?
              render json: { data: { html: result.data.fetch(:html), sample: false } }
            else
              render_sample(template)
            end
          end

          private

          def find_or_build
            Current.school.contract_template ||
              Current.school.build_contract_template(body_html: ContractTemplate.default_body_html)
          end

          def render_template(template)
            ContractTemplateBlueprint.render_as_hash(
              template, url_helpers: Rails.application.routes.url_helpers
            )
          end

          # The newest contract that has a guardian attached — the closest thing to what the next
          # send will look like.
          def preview_contract
            Current.school.contracts.kept
                   .joins(student: :student_guardians)
                   .merge(StudentGuardian.kept)
                   .order(id: :desc)
                   .first
          end

          # No contract yet: still show the layout, with the tokens left visible so it is obvious
          # they are placeholders rather than real data.
          def render_sample(template)
            html = ::Contracts::PreviewTemplateService.call(template: template).data.fetch(:html)

            render json: { data: { html: html, sample: true } }
          end

          def attach_logo(template)
            file = params.dig(:contract_template, :logo)
            return if file.blank?

            template.logo.attach(file)
          end

          def template_params
            params.require(:contract_template)
                  .permit(:body_html, :signature_x, :signature_y, :signature_page)
          end
        end
      end
    end
  end
end
