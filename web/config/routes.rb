# frozen_string_literal: true

require Rails.root.join("lib/school_lab/api_docs")

Rails.application.routes.draw do
  if SchoolLab::ApiDocs.enabled?
    mount Rswag::Ui::Engine => "/api-docs"
    mount Rswag::Api::Engine => "/api-docs"
  end

  get "up" => "rails/health#show", as: :rails_health_check

  mount LetterOpenerWeb::Engine, at: "/letter_opener" if Rails.env.development?

  namespace :api do
    namespace :v1 do
      scope :auth do
        post "login", to: "auth#login"
        post "oauth/google", to: "auth#google_login"
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
      resources :notifications, only: %i[index update] do
        collection do
          post :mark_all_as_read
        end
      end
      namespace :platform do
        resource :operational_summary, only: :show, controller: "operational_summary"
        resources :audits, only: :index
        resources :operators, only: :index
        resources :school_groups do
          member do
            get :schools
            post :assign_school
            delete "schools/:school_id", action: :unassign_school, as: :unassign_school
          end
        end
        resources :subscriptions, only: %i[index show create update] do
          member do
            post :checkout
            get :invoices
            post :change_plan
            post :cancel
          end
        end
        resources :plans, only: :index
        namespace :analytics do
          resource :overview, only: :show, controller: "overview"
        end
        resources :impersonations, only: %i[create destroy]
        namespace :help_taxonomy do
          resources :categories
        end
      end
      namespace :marketing do
        resource :demo_request, only: :create, controller: "demo_requests"
      end

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
          post :restore
          get :modules, to: "schools/modules#show"
          patch :modules, to: "schools/modules#update"
        end
        scope module: :schools do
          namespace :provisioning do
            resource :import, only: :create, controller: "imports"
            resource :resend_invites, only: :create, controller: "resend_invites"
          end

          resource :dashboard, only: :show, controller: "dashboard"
          resource :platform_subscription, only: :show, controller: "platform_subscriptions" do
            post :checkout
            post :change_plan
            post :cancel
            get :invoices
          end
          resources :platform_plans, only: :index
          resources :bank_credentials, only: %i[index create]
          resources :signature_credentials, only: %i[index create]
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
              resource :health_profile, only: :show, controller: "student_health_profiles"
              resources :health_records, only: %i[index show], controller: "student_health_records"
              # Who the family allows to collect the child. Staff read it at the gate.
              resources :authorized_pickups, only: :index
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
              # Where the collaborator's salary is sent. One standing record per person, so it is
              # a singular resource rather than a list.
              resource :bank_account, only: %i[show update], controller: "teacher_bank_accounts"
            end
            resources :teaching_assignments, only: %i[index destroy]

            # The grade book: the grid of periods/components for one class + subject, read whole
            # and written a cell at a time (components/templates/roster/entries already exist —
            # this is the teacher-facing read + single-cell write on top of them).
            get "classes/:school_class_id/grade_book", to: "grade_books#show"
            put "classes/:school_class_id/grade_book/entries", to: "grade_books#update_entry"

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
            resources :report_card_publications, only: %i[index show] do
              member do
                post :republish
              end
              resources :snapshots, only: :show, controller: "report_card_snapshots" do
                member do
                  get :pdf
                end
              end
            end

            # Teacher live, unpublished, cross-subject PDF preview from the grade-entry screen
            # (BR-RC14). Deliberately not nested under report_card_publications: this path never
            # creates a publication, snapshot, or stored PDF.
            get "students/:student_id/report_card_preview/pdf", to: "report_card_previews#pdf"
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
            resources :service_invoices, only: %i[index show] do
              member do
                get :pdf
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
            resources :service_invoices, only: %i[index] do
              member do
                get :pdf
              end
            end
            resources :students, only: :index do
              resource :health_profile, only: %i[show update], controller: "student_health_profiles"
              resources :health_records, controller: "student_health_records"
              # And names who may collect them at the gate.
              resources :authorized_pickups, only: %i[index create destroy]
            end
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
  post "webhooks/platform_billing/:provider/:token", to: "webhooks/platform_billing#create",
       as: :platform_billing_webhook
  post "webhooks/:provider/:token", to: "webhooks/providers#create", as: :provider_webhook
end
