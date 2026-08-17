# frozen_string_literal: true

require Rails.root.join("lib/school_lab/api_docs")

Rails.application.routes.draw do
  if SchoolLab::ApiDocs.enabled?
    mount Rswag::Ui::Engine => "/api-docs"
    mount Rswag::Api::Engine => "/api-docs"
  end

  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      scope :auth do
        post "login", to: "auth#login"
        post "refresh", to: "auth#refresh"
        post "logout", to: "auth#logout"
        post "password", to: "auth#password"
        put "password", to: "auth#password"
        post "invite/accept", to: "auth#invite_accept"
        # Completing a reset is necessarily unauthenticated — whoever is doing it cannot sign in.
        post "password/reset", to: "auth#reset_password"
        # A guardian asking for their own way in, by the CPF the school registered them under.
        post "access", to: "auth#request_access"
      end

      get "me", to: "me#show"
      namespace :me do
        resources :device_tokens, only: :create
        resources :memberships, only: [] do
          member do
            post :accept
          end
        end
      end

      resources :schools, only: %i[index show create update destroy] do
        member do
          post :handoff
          patch :modules, to: "schools/modules#update"
        end
        scope module: :schools do
          namespace :provisioning do
            resource :import, only: :create, controller: "imports"
          end

          resource :dashboard, only: :show, controller: "dashboard"
          resources :bank_credentials, only: %i[index create]
          namespace :people do
            resources :guardians do
              collection do
                get :report
              end
              member do
                post :activate
                post :access
              end
            end
            resources :students do
              collection do
                get :report
              end
              member do
                post :activate
              end
              resources :guardians, only: %i[index create], controller: "student_guardians"
            end
            resources :student_guardians, only: :destroy
            resources :memberships do
              member do
                post :invite
                patch :permissions
              end
            end
          end

          namespace :academics do
            resources :job_positions, only: %i[index create update destroy] do
              collection do
                post :provision_defaults
              end
            end
            resources :subjects, only: %i[index create update destroy]
            resources :school_classes, only: %i[index show create update destroy]
            resources :teachers, only: %i[index show create update destroy] do
              resources :teaching_assignments, only: :create
            end
            resources :teaching_assignments, only: %i[index destroy]

            # The mark sheet: read whole for one class and subject, written a cell at a time. The
            # cell is identified by the student and the period, not by a row id — the screen edits
            # a grid, and a cell that has never been marked has no row yet.
            resources :grades, only: :index do
              put :cell, on: :collection
            end

            # Preceptoria: a teacher's account of a student, in prose. Written as a draft and
            # published deliberately, so the guardian-facing state change is a member rather
            # than a status field anyone can write.
            resources :preceptorship_reports, except: %i[new edit] do
              # The roll a teacher may write about — the register's own student list is gated on
              # a permission teachers do not hold.
              get :roll, on: :collection
              member do
                post :publish
                get :pdf
              end
            end

            resources :academic_periods, only: [] do
              member do
                get :closure_checklist
                post :start_closure
              end
            end

            resource :report_card_config, only: %i[show update]
            resources :report_card_publication_batches, only: %i[create show] do
              collection do
                post :validate
              end
            end
            resources :report_card_publish_schedules, only: :show
            resources :report_card_publications, only: :show do
              member do
                post :republish
              end
              resources :snapshots, only: :show, controller: "report_card_snapshots" do
                member do
                  get :pdf
                end
              end
            end
          end

          namespace :communication do
            resources :conversations, only: :index
          end

          resources :school_years, only: %i[index show create update destroy] do
            collection do
              get :active
            end
            member do
              post :activate
              post :archive
            end
            resources :academic_periods, only: %i[index create]
            resources :holidays, only: %i[index create]
          end
          resources :academic_periods, only: :update
          resources :holidays, only: %i[update destroy]

          namespace :billing do
            get "fiscal/supported_cities", to: "supported_cities#index"
            resource :fiscal_settings, only: %i[show update]
            resources :fiscal_credentials, only: %i[index create] do
              collection do
                post :certificate
              end
            end
            resources :purposes, only: %i[index create update]
            resource :tax_declaration_settings, only: %i[show update]
            resource :settings, only: %i[show update]
            resource :contract_template, only: %i[show update], controller: "contract_template" do
              get :preview
            end
            resources :plan_discounts, only: %i[index create update destroy] do
              collection do
                post :provision_defaults
              end
            end
            resources :plans
            resources :contracts do
              collection do
                get :prefill
                # Reading a contract that does not exist yet: nothing is recorded until it is sent.
                post :preview_draft
              end
              member do
                post :sign
                post :send_for_signature
                # Calls off a contract the family has not signed, withdrawing it at the provider.
                post :cancel_signature
                get :preview
                # The same agreement `preview` renders, as the PDF that goes out for signature.
                get :document
                # The provider's own file, with the signature page. Served through here because
                # its URL answers only to the school's API token, which no browser may hold.
                get :signed_document
              end
            end
            resources :charge_generations, only: :create
            # Picking contracts by hand and billing the lot in one pass.
            resources :charge_batches, only: %i[index create]
            resources :transactions, only: %i[index create update destroy]
            resources :charges, only: %i[index show create destroy] do
              member do
                post :cancel
                post :reissue
              end
            end
            resources :payments, only: %i[index show]
            resource :summary, only: :show, controller: "summary"
          end

          resources :documents do
            member do
              post :approve
              post :reject
            end
          end

          # Solicitações: what guardians have asked the school for. Worked as one queue, so the
          # state changes are members rather than a status field anyone can write.
          resources :requests, only: %i[index show create destroy] do
            member do
              post :start
              post :release
              post :fulfill
              post :reject
            end
          end

          get :permission_definitions, to: "permission_definitions#index"

          resources :role_templates, only: %i[index create update destroy] do
            member do
              post :clone
            end
          end

          namespace :me do
            resources :charges, only: %i[index show] do
              collection do
                get :history
              end
              member do
                post :reissue
              end
            end
            resources :payments, only: :index
            resources :students, only: :index
            resources :documents, only: :index
            resources :requests, only: %i[index show create]
            resources :preceptorship_reports, only: %i[index show] do
              get :pdf, on: :member
            end
            resources :report_cards, only: %i[index show] do
              member do
                get "snapshots/:snapshot_id", action: :snapshot
                get "snapshots/:snapshot_id/pdf", action: :pdf
              end
            end
            resources :tax_declarations, only: %i[index create show] do
              resources :versions, only: %i[index show], controller: "tax_declaration_versions" do
                member do
                  get :pdf
                end
              end
            end
          end
        end
      end

      resources :users, only: [ :index ] do
        member do
          post :disable
          post :enable
        end
      end
    end
  end

  post "webhooks/signatures/:token", to: "webhooks/signatures#create"
  post "webhooks/spedy/:token", to: "webhooks/spedy#create"
  post "webhooks/:provider/:token", to: "webhooks/providers#create", as: :provider_webhook
end
