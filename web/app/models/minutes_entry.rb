# frozen_string_literal: true

# One ata of the Livro Ata (BR-LA02..BR-LA06): a typed, dated record with a rich-text body, written
# in the product, rendered to PDF and signed by its participants through the e-signature provider.
#
# The body can name children and families (LGPD), so it is sanitized to a small HTML allowlist and
# the entry is only ever reached through a school-scoped policy.
class MinutesEntry < ApplicationRecord
  include Discard::Model
  include SchoolAuditable
  include MinutesEntryStateMachine

  KINDS = %w[meeting class_council final_results].freeze
  STATUSES = %w[draft pending_signature signed cancelled].freeze

  # What a rich-text editor may send for an ata: headings, paragraphs, lists, bold/italic and line
  # breaks. No attributes at all — links, styles and handlers are dropped.
  ALLOWED_BODY_TAGS = %w[h1 h2 h3 h4 p ul ol li strong em br].freeze

  belongs_to :school
  belongs_to :minutes_book
  belongs_to :school_class, optional: true
  belongs_to :created_by_membership, class_name: "Membership", optional: true

  has_many :minutes_participants, -> { order(:id) }, dependent: :destroy, inverse_of: :minutes_entry
  # The signed copy once the provider returns it; before that, the preview render is never stored.
  has_one_attached :pdf

  before_validation :sanitize_body

  validates :kind, inclusion: { in: KINDS }
  validates :title, presence: true
  validates :held_on, presence: true
  validates :status, inclusion: { in: STATUSES }
  validate :kind_is_fixed_after_creation, on: :update
  validate :book_belongs_to_school
  validate :school_class_only_for_class_council
  validate :school_class_belongs_to_school

  scope :for_book, ->(book_id) { where(minutes_book_id: book_id) }
  scope :of_kind, ->(kind) { where(kind: kind) }
  scope :with_status, ->(status) { where(status: status) }
  scope :for_year, ->(year) { joins(:minutes_book).where(minutes_books: { year: year }) }
  scope :newest_first, -> { order(held_on: :desc, id: :desc) }

  # Case- and accent-insensitive substring match over the participants' names (BR-LA07).
  scope :with_participant_named, lambda { |term|
    pattern = "%#{sanitize_sql_like(term.to_s.strip)}%"

    where(
      id: MinutesParticipant.where("unaccent(lower(minutes_participants.name)) LIKE unaccent(lower(?))", pattern)
                            .select(:minutes_entry_id)
    )
  }

  def self.sanitize_body(html)
    return if html.blank?

    # The sanitizer unwraps disallowed tags but keeps their text; a script's or style's text is
    # code, not content, so it goes with the element.
    without_code = html.to_s.gsub(%r{<(script|style)\b.*?</\1\s*>}im, "")

    Rails::HTML5::SafeListSanitizer.new.sanitize(
      without_code, tags: ALLOWED_BODY_TAGS, attributes: []
    ).strip.presence
  end

  # Only a draft can be edited (BR-LA05).
  def editable?
    draft?
  end

  def signers
    minutes_participants.select(&:signs)
  end

  private

  def sanitize_body
    self.body = self.class.sanitize_body(body)
  end

  def kind_is_fixed_after_creation
    errors.add(:kind, :immutable) if kind_changed?
  end

  def book_belongs_to_school
    return if minutes_book.blank? || school_id.blank?

    errors.add(:minutes_book, :invalid) unless minutes_book.school_id == school_id
  end

  def school_class_only_for_class_council
    return if school_class_id.blank?

    errors.add(:school_class, :invalid) unless kind == "class_council"
  end

  def school_class_belongs_to_school
    return if school_class.blank? || school_id.blank?

    errors.add(:school_class, :invalid) unless school_class.school_id == school_id
  end
end
