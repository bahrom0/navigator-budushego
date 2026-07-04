export interface NCTCode {
  code: string
  title_ru: string
  cluster: number
  cluster_name_ru: string
  level_allowed: string[]
  institution: string
  city: string
  study_form: string[]
  study_type: string[]
  languages: string[]
  exams_required: string[]
  restrictions: string[]
  description_plain: string
  career_matches: string[]
  source: {
    type: string
    url: string
    page: number
  }
  confidence: number
  last_verified_at: string
  academic_year: string
}

export interface NCTMatchResult {
  code: string
  title_ru: string
  institution: string
  city: string
  confidence: number
  career_matches: string[]
  matchScore: number
  finalScore: number
  matchedKeywords: string[]
  cluster?: number
  cluster_name_ru?: string
  study_form?: string[]
  study_type?: string[]
  taxonomyPath?: string[]
  matchedTaxonomyNodeIds?: string[]
  primaryTaxonomyNodeId?: string
  rootTaxonomyNodeIds?: string[]
  branchKey?: string
  lexicalScore?: number
  semanticScore?: number
  taxonomyScore?: number
  facetScore?: number
  qualityScore?: number
  searchIntent?: "broad" | "narrow" | "facet" | "code" | "comparison"
}

export interface RankedNCT extends NCTMatchResult {
  rank: number
  finalScore: number
  reasoning: string
}

export interface ExplanationResult {
  code: string
  title_ru: string
  whyItFits: string
  matchedInterests: string[]
  matchedCareers: string[]
}
