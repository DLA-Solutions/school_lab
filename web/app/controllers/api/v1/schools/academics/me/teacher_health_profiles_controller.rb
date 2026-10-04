# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        module Me
          # A teacher's own self-service view of their health profile (BC6) — resolved by email
          # match against the logged-in user, never by a `:teacher_id` param, so a teacher cannot
          # reach a colleague's profile by changing the URL.
          class TeacherHealthProfilesController < BaseController
            include TeacherHealthProfileAccess

            private

            def teacher
              @teacher ||= Current.school.teachers.kept.find_by!(email: Current.user.email)
            end
          end
        end
      end
    end
  end
end
