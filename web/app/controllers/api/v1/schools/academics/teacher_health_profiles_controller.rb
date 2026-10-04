# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        # Staff-facing read of a collaborator's health profile (BC6), on the Colaboradores
        # roster. Writing is deliberately not routed here — only the teacher themself may write
        # their own profile, via the `academics/me` self-service endpoint below.
        class TeacherHealthProfilesController < BaseController
          include TeacherHealthProfileAccess

          undef :update

          private

          def teacher
            @teacher ||= policy_scope(Teacher).find(params[:teacher_id])
          end
        end
      end
    end
  end
end
