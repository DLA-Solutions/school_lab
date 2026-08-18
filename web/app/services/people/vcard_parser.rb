# frozen_string_literal: true

module People
  # Reads the vCard exports a school's old system or a phone produces — the form a list of people
  # actually arrives in, rather than a spreadsheet somebody would have to retype it into first.
  #
  # The address in these exports is not laid out the way RFC 6350 describes. The school's own
  # export puts the neighbourhood where the locality belongs and leaves the region empty, which is
  # why `ADR` is read by position and the fourth component is taken as the neighbourhood. City and
  # state are left blank rather than guessed from the postcode — an address invented here would be
  # believed.
  class VcardParser
    # `00000000` is how these exports write "we never wrote it down". Storing it would make an
    # unusable address look complete.
    BLANK_ZIP_CODE = "00000000"

    def self.call(text)
      new(text).call
    end

    def initialize(text)
      @text = text.to_s
    end

    def call
      text.scan(/BEGIN:VCARD(.*?)END:VCARD/m).map { |body| parse_card(unfold(body.first)) }
    end

    private

    attr_reader :text

    # A vCard line longer than 75 characters is continued on the next line, which begins with a
    # space. Joining them back is the first thing any reader has to do.
    def unfold(body)
      body.gsub(/\r?\n[ \t]/, "")
    end

    def parse_card(body)
      indexed = body.lines.filter_map { |line| parse_line(line) }.group_by(&:first)

      {
        name: value_of(indexed, "FN"),
        title: value_of(indexed, "TITLE"),
        phone: value_of(indexed, "TEL"),
        email: email_from(value_of(indexed, "EMAIL")),
        # Kept so the importer can tell the school which addresses it threw away, instead of the
        # gap simply appearing one day.
        discarded_email: discarded_email_from(value_of(indexed, "EMAIL")),
        cpf: value_of(indexed, "X-CPF"),
        address: address_from(value_of(indexed, "ADR"))
      }
    end

    def parse_line(line)
      stripped = line.strip
      return nil if stripped.blank?

      name, value = stripped.split(":", 2)
      return nil if value.nil?

      # `TEL;TYPE=HOME` — the parameters say how to reach somebody, not what is being given.
      [ name.split(";").first.upcase, value.strip ]
    end

    def value_of(indexed, name)
      indexed[name]&.first&.last.presence
    end

    # Exports carry addresses that are not addresses — "nÃo informado", or one with a space
    # dropped into the middle of the domain. They are reported and dropped rather than repaired:
    # a guessed correction sends somebody's mail to a stranger.
    def email_from(value)
      return nil if value.blank?

      value.match?(URI::MailTo::EMAIL_REGEXP) ? value : nil
    end

    def discarded_email_from(value)
      value.presence && email_from(value).nil? ? value : nil
    end

    # `;;RUA 7;SETOR OESTE;;74110090;BR` — street, then what this export calls the locality and
    # everyone at the school calls the bairro, then an empty region, then the postcode.
    def address_from(value)
      return {} if value.blank?

      parts = value.split(/(?<!\\);/, -1).map { |part| unescape(part) }
      zip_code = parts[5]

      {
        street: parts[2],
        neighborhood: parts[3],
        state: parts[4],
        zip_code: zip_code == BLANK_ZIP_CODE ? nil : zip_code
      }.compact_blank
    end

    def unescape(part)
      part.to_s.gsub(/\\([,;\\])/, '\1').strip.presence
    end
  end
end
