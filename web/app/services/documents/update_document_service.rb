# frozen_string_literal: true

module Documents
  class UpdateDocumentService < ApplicationService
    def initialize(document:, params:, file: nil)
      @document = document
      @params = params
      @file = file
    end

    def call
      document.assign_attributes(params)
      document.file.attach(file) if file.present?

      if document.save
        ResponseService.success(data: document)
      else
        ResponseService.failure(code: :validation_error, details: document.errors.to_hash)
      end
    end

    private

    attr_reader :document, :params, :file
  end
end
