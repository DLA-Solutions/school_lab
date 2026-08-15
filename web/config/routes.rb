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
        end
        scope module: :schools do
          namespace :provisioning do
            resource :import, only: :create, controller: "imports"
          end

          resource :dashboard, only: :show, controller: "dashboard"
          resources :bank_credentials, only: %i[index create]
          namespace :people do
            resources :guardians do
              member do
                post :activate
              end
            end
            resources :students do
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
            # No `destroy`: a cohort is never deleted — see `SchoolClassPolicy`.
            resources :school_classes, only: %i[index show create update]
            resources :teachers, only: %i[index show create update destroy] do
              resources :teaching_assignments, only: :create
            end
            resources :teaching_assignments, only: :destroy
          end

          namespace :communication do
            resources :conversations, only: :index
          end

          namespace :billing do
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
                get :preview
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
  post "webhooks/:provider/:token", to: "webhooks/providers#create", as: :provider_webhook
end
