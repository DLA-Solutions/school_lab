# frozen_string_literal: true

module Gateways
  module Signature
    module Autentique
      # Autentique's API is GraphQL over a single endpoint, and file upload follows the GraphQL
      # multipart request spec: an `operations` part with the query, a `map` part saying where the
      # file belongs in the variables, and the file itself as a separate part.
      #
      # https://docs.autentique.com.br/api
      class Adapter
        include Interface

        PROVIDER = "autentique"
        ENDPOINT = "https://api.autentique.com.br/v2/graphql"

        # The provider caps callers at 60 requests per minute; a contract send is one request, so
        # the timeout is about a slow upload rather than about throughput.
        OPEN_TIMEOUT = 10
        TIMEOUT = 60

        CREATE_DOCUMENT_MUTATION = <<~GRAPHQL
          mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
            createDocument(document: $document, signers: $signers, file: $file) {
              id
              name
              signatures {
                public_id
                name
                email
                link { short_link }
                signed { created_at }
              }
            }
          }
        GRAPHQL

        # `action` is what separates a signer from the account owner: Autentique lists the owner
        # among a document's signatures with no action at all, and counting them as an outstanding
        # party leaves every document reading as unsigned forever.
        DOCUMENT_QUERY = <<~GRAPHQL
          query DocumentQuery($id: UUID!) {
            document(id: $id) {
              id
              files { signed }
              signatures {
                public_id
                email
                action { name }
                signed { created_at }
                rejected { created_at }
                link { short_link }
              }
            }
          }
        GRAPHQL

        def initialize(school:, config:)
          @school = school
          @config = config
        end

        def create_document(request)
          body = post_multipart(multipart_payload(request))

          document = body.dig("data", "createDocument")
          raise ValidationError, "Autentique returned no document" if document.blank?

          to_remote_document(document)
        end

        def fetch_document(provider_document_id:)
          # No file, so this is a plain GraphQL request rather than a multipart one.
          body = post_json(query: DOCUMENT_QUERY, variables: { id: provider_document_id })

          document = body.dig("data", "document")
          raise ValidationError, "Autentique returned no document" if document.blank?

          to_remote_document(document)
        end

        private

        attr_reader :school, :config

        def multipart_payload(request)
          operations = {
            query: CREATE_DOCUMENT_MUTATION,
            variables: {
              document: { name: request.name, message: request.message }.compact,
              signers: request.signers.map { |signer| signer_input(signer) },
              file: nil
            }
          }

          {
            operations: operations.to_json,
            # Points the uploaded part at `variables.file`, as the spec requires.
            map: { file: [ "variables.file" ] }.to_json,
            file: Faraday::Multipart::FilePart.new(
              StringIO.new(request.pdf), request.content_type, request.filename
            )
          }
        end

        # The signer is reached by e-mail and identified by CPF: `configs.cpf` makes the provider
        # demand that document from whoever opens the link, so the person who signs is the person
        # named on the contract.
        def signer_input(signer)
          {
            email: signer.email,
            action: "SIGN",
            configs: { cpf: signer.cpf }.compact_blank,
            positions: signer.positions.map { |position| signature_position(position) }
          }.compact_blank
        end

        # Autentique takes x and y as strings holding a percentage of the page, measured from its
        # top-left corner, and `z` as the page number.
        def signature_position(position)
          {
            x: format("%.2f", position.fetch(:x)),
            y: format("%.2f", position.fetch(:y)),
            z: position.fetch(:z),
            element: "SIGNATURE"
          }
        end

        def post_multipart(payload)
          dispatch { multipart_connection.post("", payload) }
        end

        def post_json(operation)
          dispatch do
            json_connection.post("", operation.to_json, "Content-Type" => "application/json")
          end
        end

        def dispatch
          response = yield

          handle_transport_status(response)

          body = parse(response.body)
          raise_on_graphql_errors(body)

          body
        rescue Faraday::TimeoutError, Faraday::ConnectionFailed => e
          raise TransientError, "Autentique unreachable: #{e.message}"
        end

        # GraphQL answers 200 even for a rejected query, so the HTTP status only tells us about
        # transport and credentials.
        def handle_transport_status(response)
          case response.status
          when 200 then nil
          when 401, 403
            raise AuthenticationError, "Autentique rejected the API token"
          when 429
            raise TransientError, "Autentique rate limit reached"
          when 500..599
            raise TransientError, "Autentique returned #{response.status}"
          else
            raise ValidationError, "Autentique returned #{response.status}: #{response.body}"
          end
        end

        def raise_on_graphql_errors(body)
          errors = body["errors"]
          return if errors.blank?

          message = Array(errors).filter_map { |error| error["message"] }.join("; ")
          raise ValidationError, "Autentique refused the request: #{message}"
        end

        def parse(body)
          return body if body.is_a?(Hash)

          JSON.parse(body.to_s)
        rescue JSON::ParserError
          raise ValidationError, "Autentique returned a body that is not JSON"
        end

        def to_remote_document(document)
          signatures = Array(document["signatures"])

          ValueObjects::RemoteDocument.new(
            provider_document_id: document["id"],
            status: status_of(signatures),
            signed_file_url: document.dig("files", "signed"),
            signer_links: signatures.filter_map do |signature|
              url = signature.dig("link", "short_link")
              next if url.blank?

              ValueObjects::SignerLink.new(email: signature["email"], url: url)
            end
          )
        end

        # Only the parties actually asked to sign decide the outcome. Autentique also lists the
        # account owner among a document's signatures — no action, and never a signature — so
        # requiring every entry to have signed would keep a fully signed contract "pending" for
        # good. That is exactly what it did.
        def status_of(signatures)
          signers = signatures.select { |signature| signature.dig("action", "name") == "SIGN" }
          # Falling back to every entry keeps an older document, or one whose shape changed,
          # readable rather than silently unsigned.
          signers = signatures if signers.empty?

          return "pending" if signers.empty?
          return "rejected" if signers.any? { |signature| signature.dig("rejected", "created_at") }
          return "signed" if signers.all? { |signature| signature.dig("signed", "created_at") }

          "pending"
        end

        def multipart_connection
          @multipart_connection ||= build_connection(multipart: true)
        end

        def json_connection
          @json_connection ||= build_connection(multipart: false)
        end

        def build_connection(multipart:)
          SchoolLab::Http.build_connection(
            base_url: ENDPOINT,
            open_timeout: OPEN_TIMEOUT,
            read_timeout: TIMEOUT,
            multipart: multipart
          ).tap do |faraday|
            faraday.headers["Authorization"] = "Bearer #{config.api_token}"
          end
        end
      end
    end
  end
end
