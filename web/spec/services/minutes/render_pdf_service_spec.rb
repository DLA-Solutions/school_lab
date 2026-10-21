# frozen_string_literal: true

require "rails_helper"

RSpec.describe Minutes::RenderPdfService do
  let(:school) { create(:school, name: "Colégio Aurora") }
  let(:book) { create(:minutes_book, school: school, name: "Livro 2026", year: 2026) }
  let(:entry) do
    create(:minutes_entry, school: school, minutes_book: book, title: "Conselho do 1º bimestre",
                           body: "<h2>Pauta</h2><p>Texto com <strong>negrito</strong> &amp; <em>itálico</em></p>" \
                                 "<ul><li>Item um</li></ul><ol><li>Passo</li></ol>")
  end
  let!(:signer_a) { create(:minutes_participant, :signer, school: school, minutes_entry: entry, name: "Ana") }
  let!(:signer_b) { create(:minutes_participant, :signer, school: school, minutes_entry: entry, name: "Beto") }

  def text_of(pdf_bytes)
    PDF::Reader.new(StringIO.new(pdf_bytes)).pages.map(&:text).join("\n")
  end

  it "returns a PDF, a filename and a position for every signer" do
    result = described_class.call(entry: entry)

    expect(result).to be_success
    expect(result.data[:pdf]).to start_with("%PDF")
    expect(result.data[:filename]).to eq("ata-#{entry.id}-conselho-do-1-bimestre.pdf")
    expect(result.data[:signature_positions].keys).to contain_exactly(signer_a.id, signer_b.id)
    expect(result.data[:signature_positions][signer_a.id]).to include(:x, :y, :z)
  end

  it "places the second signer lower than the first" do
    positions = described_class.call(entry: entry).data[:signature_positions]

    expect(positions[signer_b.id][:y]).to be > positions[signer_a.id][:y]
  end

  it "draws the school, book, kind, title, date, body and participants" do
    text = text_of(described_class.call(entry: entry).data[:pdf])

    expect(text).to include("Colégio Aurora", "Livro 2026", "ATA DE REUNIÃO", "Conselho do 1º bimestre",
                            "10/03/2026", "Pauta", "negrito", "Item um", "1. Passo", "Participantes", "Ana", "Beto")
  end
end
