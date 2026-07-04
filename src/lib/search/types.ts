export type SearchIntent =
  | "broad"
  | "narrow"
  | "facet"
  | "code"
  | "comparison"

export type NodeOrigin = "system" | "ai" | "user" | "legacy"

export interface SearchFilters {
  city?: string[]
  educationLevel?: Array<"after_9" | "after_11">
  studyForm?: string[]
  studyType?: string[]
  clusterIds?: number[]
}

export interface SearchCategoryInput {
  id: string
  name: string
  description?: string
}

export interface SearchInput {
  query?: string
  categories?: SearchCategoryInput[]
  keywords?: string[]
  filters?: SearchFilters
  topK?: number
  minScore?: number
  diversify?: boolean
  maxPerBranch?: number
}

export interface TaxonomyNodeSpec {
  id: string
  parentId: string | null
  label: string
  aliases?: string[]
  keywords?: string[]
  clusterIds?: number[]
  origin?: NodeOrigin
  active?: boolean
}

export interface TaxonomyNode extends TaxonomyNodeSpec {
  childrenIds: string[]
  depth: number
  path: string[]
}

export interface TaxonomyRule {
  nodeId: string
  patterns: Array<string | RegExp>
  weight: number
}

export interface SearchDocument {
  id: string
  code: string
  title: string
  institution: string
  city: string
  location: string
  searchText: string
  cluster: number
  educationLevel: "after_9" | "after_11"
  educationForm: string
  educationType: string
  admissionPlan: number
  sourcePage: number
  taxonomyNodeIds: string[]
  primaryTaxonomyNodeId: string
  rootTaxonomyNodeIds: string[]
  taxonomyLabels: string[]
  taxonomyPath: string[]
  branchKey: string
  titleTokens: Set<string>
  institutionTokens: Set<string>
  cityTokens: Set<string>
  codeTokens: Set<string>
  taxonomyTokens: Set<string>
  aliasTokens: Set<string>
  studyFormTokens: Set<string>
  studyTypeTokens: Set<string>
  languageTokens: Set<string>
  allTokens: Set<string>
  semanticVector: Float32Array
}

export interface SearchManifest {
  version: string
  builtAt: string
  documentCount: number
  taxonomyVersion: string
  embeddingDimension: number
  maxAdmissionPlan: number
}

export interface SearchIndex {
  manifest: SearchManifest
  taxonomyById: Map<string, TaxonomyNode>
  rootNodeIds: string[]
  aliasToNodeIds: Map<string, string[]>
  descendantsById: Map<string, string[]>
  ancestorsById: Map<string, string[]>
  docsById: Map<string, SearchDocument>
  nodeToDocIds: Map<string, string[]>
  tokenToDocIds: Map<string, Set<string>>
  tokenDocumentFrequency: Map<string, number>
  phraseToDocIds: Map<string, Set<string>>
  docVectors: Map<string, Float32Array>
  maxAdmissionPlan: number
}

export interface SearchQuery {
  raw: string
  normalized: string
  tokens: string[]
  phrases: string[]
  intent: SearchIntent
  seedNodeIds: string[]
  expandedNodeIds: string[]
  exclusionTokens: string[]
  filters: SearchFilters
  vector: Float32Array
  breadth: number
}

export interface SearchCandidate {
  id: string
  code: string
  title: string
  institution: string
  city: string
  cluster: number
  confidence: number
  matchScore: number
  finalScore: number
  lexicalScore: number
  semanticScore: number
  taxonomyScore: number
  facetScore: number
  qualityScore: number
  matchedTokens: string[]
  matchedNodeIds: string[]
  matchedAliases: string[]
  taxonomyPath: string[]
  taxonomyLabels: string[]
  primaryTaxonomyNodeId: string
  rootTaxonomyNodeIds: string[]
  branchKey: string
  searchIntent: SearchIntent
  educationLevel: "after_9" | "after_11"
  educationForm: string
  educationType: string
  admissionPlan: number
  sourcePage: number
}
