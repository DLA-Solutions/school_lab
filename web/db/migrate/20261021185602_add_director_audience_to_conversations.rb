# frozen_string_literal: true

# Family chat can address the school's Direção. The audience check must accept "director";
# the teacher/teacher_id check and the partial unique indexes stay as they are, because a
# director row has teacher_id null like coordination and secretary.
class AddDirectorAudienceToConversations < ActiveRecord::Migration[8.1]
  def up
    remove_check_constraint :conversations, name: "conversations_audience_valid"
    add_check_constraint :conversations,
                         "audience IN ('coordination', 'secretary', 'director', 'teacher')",
                         name: "conversations_audience_valid"
  end

  # Rolling back fails while any conversation has audience "director"; those rows must be removed first.
  def down
    remove_check_constraint :conversations, name: "conversations_audience_valid"
    add_check_constraint :conversations,
                         "audience IN ('coordination', 'secretary', 'teacher')",
                         name: "conversations_audience_valid"
  end
end
