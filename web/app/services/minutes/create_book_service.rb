# frozen_string_literal: true

module Minutes
  # Opens a yearly Livro Ata for the school (UC-LA01). A second book with the same name in the same
  # year is refused with a validation error — the model checks it and the partial unique index
  # backs it up against a concurrent create.
  class CreateBookService < ApplicationService
    def initialize(school:, params:, membership: nil)
      @school = school
      @params = params
      @membership = membership
    end

    def call
      book = school.minutes_books.build(params.slice(:name, :year))
      book.created_by_membership = membership

      if book.save
        ResponseService.success(data: book)
      else
        ResponseService.failure(code: :validation_error, details: book.errors.to_hash)
      end
    rescue ActiveRecord::RecordNotUnique
      ResponseService.failure(
        code: :validation_error,
        details: { name: [ I18n.t("errors.messages.taken") ] }
      )
    end

    private

    attr_reader :school, :params, :membership
  end
end
