# frozen_string_literal: true

module Auth
  # A guardian asking for their own way in, identified by the CPF the school registered them under.
  #
  # The answer never varies. A screen that said "this CPF is not registered" would let anyone walk
  # a list of CPFs and learn which children attend the school — so a match, a miss and a guardian
  # who has been deactivated all produce the same 204, and whatever is to be done is done in the
  # inbox of the address already on file. Nothing about who is registered is returned.
  #
  # The link that arrives is the same one the school's own "send access" button produces.
  class RequestGuardianAccessService < ApplicationService
    def initialize(cpf:)
      @cpf = Cpf.normalize(cpf)
    end

    def call
      # Still success: the caller must not be able to tell a malformed CPF from an unknown one.
      return ResponseService.success if cpf.blank?

      Guardian.kept.where(cpf: cpf).find_each do |guardian|
        next if guardian.email.blank?

        People::SendGuardianAccessService.call(guardian: guardian)
      end

      ResponseService.success
    end

    private

    attr_reader :cpf
  end
end
