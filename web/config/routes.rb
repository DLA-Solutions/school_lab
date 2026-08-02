# frozen_string_literal: true

Rails.application.routes.draw do
  if defined?(Rswag::Ui::Engine)
    mount Rswag::Ui::Engine => "/api-docs"
  end
  mount Rswag::Api::Engine => "/api-docs"

  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      scope :auth do
        post "login", to: "auth#login"
        post "refresh", to: "auth#refresh"
        post "logout", to: "auth#logout"
        post "password", to: "auth#password"
        put "password", to: "auth#password"
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
        scope module: :schools do
          resources :bank_credentials, only: %i[index create]
          namespace :people do
            resources :guardians
            resources :students do
              resources :guardians, only: %i[index create], controller: "student_guardians"
            end
            resources :student_guardians, only: :destroy
            resources :memberships do
              member do
                post :invite
              end
            end
          end

          namespace :communication do
            resources :conversations, only: :index
          end

          namespace :billing do
            resource :settings, only: %i[show update]
            resources :plans
            resources :contracts
            resources :charge_generations, only: :create
            resources :charges, only: %i[index show destroy] do
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

      resources :users, only: [] do
        member do
          post :disable
          post :enable
        end
      end
    end
  end

  post "webhooks/:provider/:token", to: "webhooks/providers#create", as: :provider_webhook
end
