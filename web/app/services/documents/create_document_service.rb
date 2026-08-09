# frozen_string_literal: true

module Documents
  class CreateDocumentService < ApplicationService
    def initialize(school:, actor:, params:, file:)
      @school = school
      @actor = actor
      @params = params
      @file = file
    end

    def call
      documentable = resolve_documentable
      return ResponseService.failure(code: :not_found) unless documentable

      document = school.documents.build(params.merge(uploaded_by: actor, documentable: documentable))
      document.file.attach(file)

      if document.save
        ResponseService.success(data: document)
      else
        ResponseService.failure(code: :validation_error, details: document.errors.to_hash)
      end
    end

    private

    attr_reader :school, :actor, :params, :file

    def resolve_documentable
      type = params[:documentable_type]
      id = params[:documentable_id]
      return unless Document::DOCUMENTABLE_TYPES.include?(type)

      case type
      when "School"
        school if school.id == id.to_i
      when "Student"
        school.students.kept.find_by(id: id)
      when "Guardian"
        school.guardians.kept.find_by(id: id)
      when "Teacher"
        school.teachers.kept.find_by(id: id)
      end
    end
  end
end
