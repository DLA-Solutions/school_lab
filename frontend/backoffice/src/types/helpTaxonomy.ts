export type HelpTaxonomyPersonaTag = 'secretary' | 'director' | 'teacher' | 'guardian';

/** Mirrors `HelpTaxonomyCategoryBlueprint`. */
export interface HelpTaxonomyCategory {
  id: number;
  name: string;
  slug: string;
  module_key: string | null;
  persona_tags: HelpTaxonomyPersonaTag[];
  position: number;
  created_at: string;
  updated_at: string;
}

export interface HelpTaxonomyCategoryPayload {
  name: string;
  module_key?: string | null;
  persona_tags?: HelpTaxonomyPersonaTag[];
  position?: number;
}
