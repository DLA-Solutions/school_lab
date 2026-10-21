# frozen_string_literal: true

require "rails_helper"
require "rake"

RSpec.describe "signature:backfill_signed_documents" do
  let(:task) { Rake::Task["signature:backfill_signed_documents"] }
  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:url) { "https://api.autentique.com.br/documentos/abc123/assinado.pdf" }
  let(:other_url) { "https://api.autentique.com.br/documentos/zzz999/assinado.pdf" }

  before do
    Rails.application.load_tasks unless Rake::Task.task_defined?("signature:backfill_signed_documents")
    task.reenable
    create(:school_signature_provider, :autentique, school: school)
    create(:school_signature_provider, :autentique, school: other_school)
    stub_request(:get, url).to_return(status: 200, body: "%PDF-1.4 a")
    stub_request(:get, other_url).to_return(status: 200, body: "%PDF-1.4 b")
  end

  def signed_contract(school:, url:)
    create(:contract, school: school, student: create(:student, school: school),
                      signature_status: "signed", signed_at: 1.day.ago, signed_document_url: url)
  end

  it "files every signed contract that has a file on record and no document yet" do
    contract = signed_contract(school: school, url: url)
    other = signed_contract(school: other_school, url: other_url)
    waiting = signed_contract(school: school, url: nil)

    expect { task.invoke }.to output(/Filed 2 signed contract/).to_stdout

    expect(contract.reload.signed_document).to be_approved
    expect(other.reload.signed_document).to be_present
    expect(waiting.reload.signed_document).to be_nil
  end

  it "is idempotent" do
    signed_contract(school: school, url: url)
    expect { task.invoke }.to output(/Filed 1/).to_stdout

    task.reenable
    expect { expect { task.invoke }.to output(/Filed 0/).to_stdout }.not_to change(Document, :count)
  end

  it "can be limited to one school" do
    signed_contract(school: school, url: url)
    other = signed_contract(school: other_school, url: other_url)

    expect { task.invoke(school.id.to_s) }.to output(/Filed 1/).to_stdout

    expect(other.reload.signed_document).to be_nil
  end
end
