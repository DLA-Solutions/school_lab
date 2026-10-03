# frozen_string_literal: true

FactoryBot.define do
  factory :lesson_plan do
    class_discipline
    school { class_discipline.school }
    date { Date.current }
    content { "Introdução a frações — exercícios 1 a 5 do livro." }
  end
end
