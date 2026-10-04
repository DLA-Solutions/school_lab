# frozen_string_literal: true

FactoryBot.define do
  factory :lesson_plan do
    class_discipline
    school { class_discipline.school }
    date { Date.current }
    topic { "Introdução a frações" }
    general_objective { "Compreender o conceito de fração como parte de um todo." }
    assessment_types { [ "formative" ] }
    assessment_formats { [ "exercises", "participation" ] }
  end
end
