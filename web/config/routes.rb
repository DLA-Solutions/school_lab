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
      end

      resources :schools, only: [] do
        scope module: :schools do
          namespace :communication do
            resources :conversations, only: :index
          end
        end
      end
    end
  end
end
