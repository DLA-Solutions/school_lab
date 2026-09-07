# frozen_string_literal: true

FactoryBot.define do
  factory :notification do
    user
    school
    kind { "contract_signed" }
    title { "Contrato assinado" }
    body { "O contrato de Aluno Exemplo foi assinado por todas as partes." }
  end
end
