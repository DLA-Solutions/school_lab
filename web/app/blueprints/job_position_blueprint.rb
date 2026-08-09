# frozen_string_literal: true

class JobPositionBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :name

  # Lets a listing disable removal for a post that collaborators still point at.
  field :in_use do |job_position|
    job_position.in_use?
  end

  field :collaborator_count do |job_position|
    job_position.teachers.kept.size
  end
end
