# frozen_string_literal: true

module Api
  module V1
    class MeController < BaseController
      def show
        render json: { data: UserBlueprint.render_as_hash(Current.user, view: :default) }
      end
    end
  end
end
