# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        # Where a collaborator's salary is sent. One standing record per person, so it is a
        # singular resource: there is nothing to list, only the account that is current.
        class TeacherBankAccountsController < BaseController
          def show
            account = bank_account_for(teacher)
            authorize account, :show?

            render json: { data: TeacherBankAccountBlueprint.render_as_hash(account) }
          end

          def update
            account = bank_account_for(teacher)
            authorize account, :update?

            account.write!(bank_account_params, actor: Current.user)

            render json: { data: TeacherBankAccountBlueprint.render_as_hash(account) }
          rescue ActiveRecord::RecordInvalid => e
            render_error(:validation_error, status: :unprocessable_content,
                                            details: e.record.errors.to_hash)
          end

          private

          def teacher
            @teacher ||= policy_scope(Teacher).find(params[:teacher_id])
          end

          # Built on first read rather than alongside the collaborator: a register full of
          # untouched blank rows would report everybody as having a payment route when nobody does.
          def bank_account_for(teacher)
            teacher.bank_account ||
              teacher.build_bank_account(school_id: teacher.school_id)
          end

          def bank_account_params
            params.require(:bank_account).permit(:pix_key, :bank_name, :agency, :account_number)
          end
        end
      end
    end
  end
end
