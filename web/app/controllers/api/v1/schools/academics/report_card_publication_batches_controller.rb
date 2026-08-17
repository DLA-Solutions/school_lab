# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        class ReportCardPublicationBatchesController < BaseController
          def validate
            authorize ReportCardPublishBatch, :validate?

            result = ::ReportCards::ValidateBatchService.call(
              school: Current.school,
              school_class: find_school_class,
              academic_period: find_academic_period,
              force_publish_reason: batch_params[:force_publish_reason]
            )

            render_service_result(result) do |data|
              render json: { data: data }
            end
          end

          def create
            authorize ReportCardPublishBatch

            result = ::ReportCards::CreateBatchService.call(
              school: Current.school,
              school_class: find_school_class,
              academic_period: find_academic_period,
              requested_by_membership: Current.membership,
              scheduled_for: batch_params[:scheduled_for],
              force_publish_reason: batch_params[:force_publish_reason]
            )

            if result.success?
              status = batch_params[:scheduled_for].present? ? :accepted : :created
              render json: { data: result.data }, status: status
            else
              render_service_result(result)
            end
          end

          def show
            batch = policy_scope(ReportCardPublishBatch).find(params[:id])
            authorize batch

            results = batch_results(batch)
            render json: {
              data: ReportCardPublishBatchBlueprint.render_as_hash(batch, results: results)
            }
          end

          private

          def batch_params
            params.require(:report_card_publication_batch).permit(
              :class_id, :academic_period_id, :scheduled_for, :force_publish_reason
            )
          end

          def find_school_class
            Current.school.school_classes.kept.find(batch_params[:class_id])
          end

          def find_academic_period
            Current.school.academic_periods.kept.find(batch_params[:academic_period_id])
          end

          def batch_results(batch)
            return [] unless batch.completed?

            batch.report_card_snapshots.includes(:report_card_publication).map do |snapshot|
              {
                student_id: snapshot.report_card_publication.student_id,
                publication_id: snapshot.report_card_publication_id,
                snapshot_id: snapshot.id,
                version: snapshot.version,
                released_at: snapshot.released_at.iso8601,
                pdf_url: "/api/v1/schools/#{Current.school.id}/me/report_cards/#{snapshot.report_card_publication_id}/snapshots/#{snapshot.id}/pdf"
              }
            end
          end
        end
      end
    end
  end
end
