# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        class JobPositionsController < BaseController
          def index
            authorize JobPosition

            pagy, records = pagy(policy_scope(JobPosition).includes(:teachers).ordered)

            render json: {
              data: JobPositionBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def create
            authorize JobPosition

            job_position = Current.school.job_positions.build(job_position_params)
            save_and_render(job_position, status: :created)
          end

          def update
            job_position = policy_scope(JobPosition).find(params[:id])
            authorize job_position

            job_position.assign_attributes(job_position_params)
            save_and_render(job_position)
          end

          def destroy
            job_position = policy_scope(JobPosition).find(params[:id])
            authorize job_position

            # A collaborator is required to hold a post, so removing one still in use would leave
            # those records invalid. Say which, rather than failing on a constraint later.
            if job_position.in_use?
              return render_error(
                :validation_error,
                status: :unprocessable_content,
                details: { base: [I18n.t("api.errors.job_position_in_use",
                                         count: job_position.teachers.kept.count)] }
              )
            end

            job_position.discard
            head :no_content
          end

          # Creates whatever of the standard set the school is missing. A school opened before
          # this register existed — or a brand new one — would otherwise start with no posts and
          # no way to add a collaborator.
          def provision_defaults
            authorize JobPosition, :provision_defaults?

            positions = JobPosition.provision_defaults!(Current.school)

            render json: { data: JobPositionBlueprint.render_as_hash(positions) }, status: :created
          end

          private

          def save_and_render(job_position, status: :ok)
            if job_position.save
              render json: { data: JobPositionBlueprint.render_as_hash(job_position) }, status: status
            else
              render_error(:validation_error, status: :unprocessable_content,
                                              details: job_position.errors.to_hash)
            end
          end

          def job_position_params
            params.require(:job_position).permit(:name)
          end
        end
      end
    end
  end
end
