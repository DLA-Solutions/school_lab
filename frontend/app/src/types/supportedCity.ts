/** Mirrors `SupportedCityBlueprint`. */
export interface SupportedCity {
  code: number;
  name: string;
  state: string;
  provider: string;
  provider_options: Record<string, unknown>;
}
