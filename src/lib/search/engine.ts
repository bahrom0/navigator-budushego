import type { NCTMatchResult } from "@/types/nct"
import { loadDatabase } from "@/lib/db/nct-db"
import type { NewDbRecord } from "@/lib/db/types"
import {
  buildTokenNGrams,
  extractPhrases,
  isCodeQuery,
  normalizeCity,
  normalizeText,
  tokenize,
  uniqueTokens,
} from "./normalize"
import {
  TAXONOMY_VERSION,
  buildTaxonomyGraph,
  classifyTextToNodes,
  collectLabels,
  expandNodeSeeds,
  nodeAffinity,
  resolveNodeSeeds,
  type TaxonomyGraph,
} from "./taxonomy"
import type {
  SearchCandidate,
  SearchDocument,
  SearchFilters,
  SearchIndex,
  SearchInput,
  SearchIntent,
  SearchManifest,
  SearchQuery,
} from "./types"

const VECTOR_DIMENSION = 96

let indexPromise: Promise<SearchIndex> | null = null

export async function getSearchIndex(): Promise<SearchIndex> {
  if (!indexPromise) {
    indexPromise = buildSearchIndex()
  }

  return indexPromise
}

export async function searchSpecialties(input: SearchInput): Promise<SearchCandidate[]> {
  const index = await getSearchIndex()
  const query = buildSearchQuery(input, index)
  const candidateIds = collectCandidateIds(query, index)
  const docs = candidateIds.length > 0
    ? candidateIds.map((id) => index.docsById.get(id)).filter((doc): doc is SearchDocument => Boolean(doc))
    : [...index.docsById.values()]

  const scored = docs
    .map((doc) => scoreDocument(doc, query, index))
    .filter((candidate) => candidate.finalScore >= (input.minScore ?? 0.05))
    .sort((a, b) => {
      const scoreDelta = b.finalScore - a.finalScore
      if (Math.abs(scoreDelta) > 1e-6) return scoreDelta
      const semanticDelta = b.semanticScore - a.semanticScore
      if (Math.abs(semanticDelta) > 1e-6) return semanticDelta
      return b.qualityScore - a.qualityScore
    })

  const limit = input.topK ?? 8
  const diversified = input.diversify
    ? diversifyCandidates(scored, input.maxPerBranch ?? 2)
    : scored

  return diversified.slice(0, Math.max(limit * 3, limit))
}

export async function searchSpecialtiesAsMatches(
  input: SearchInput,
): Promise<NCTMatchResult[]> {
  const candidates = await searchSpecialties(input)
  return candidates.map((candidate) => candidateToMatchResult(candidate))
}

async function buildSearchIndex(): Promise<SearchIndex> {
  const records = await loadDatabase()
  const taxonomy = buildTaxonomyGraph()
  const docsById = new Map<string, SearchDocument>()
  const nodeToDocIds = new Map<string, string[]>()
  const tokenToDocIds = new Map<string, Set<string>>()
  const tokenDocumentFrequency = new Map<string, number>()
  const phraseToDocIds = new Map<string, Set<string>>()
  const docVectors = new Map<string, Float32Array>()

  let maxAdmissionPlan = 0
  for (const record of records) {
    if (record.admission_plan > maxAdmissionPlan) {
      maxAdmissionPlan = record.admission_plan
    }
  }

  for (const record of records) {
    const doc = buildSearchDocument(record, taxonomy, maxAdmissionPlan)
    docsById.set(doc.id, doc)
    docVectors.set(doc.id, doc.semanticVector)

    const tokenSet = new Set(doc.allTokens)
    for (const token of tokenSet) {
      addPosting(tokenToDocIds, token, doc.id)
      tokenDocumentFrequency.set(token, (tokenDocumentFrequency.get(token) ?? 0) + 1)
    }

    const docPhrases = uniqueTokens([
      ...extractPhrases(doc.searchText),
      ...buildTokenNGrams([...doc.titleTokens], [2, 3]),
      ...buildTokenNGrams(doc.taxonomyPath.flatMap((part) => tokenize(part)), [2, 3]),
    ])
    for (const phrase of docPhrases) {
      addPosting(phraseToDocIds, phrase, doc.id)
    }

    for (const nodeId of doc.taxonomyNodeIds) {
      addDocToNode(nodeToDocIds, nodeId, doc.id)
      const ancestors = taxonomy.ancestorsById.get(nodeId) ?? []
      for (const ancestorId of ancestors) {
        addDocToNode(nodeToDocIds, ancestorId, doc.id)
      }
    }
  }

  const manifest: SearchManifest = {
    version: "hybrid-search-v1",
    builtAt: new Date().toISOString(),
    documentCount: docsById.size,
    taxonomyVersion: TAXONOMY_VERSION,
    embeddingDimension: VECTOR_DIMENSION,
    maxAdmissionPlan,
  }

  return {
    manifest,
    taxonomyById: taxonomy.taxonomyById,
    rootNodeIds: taxonomy.rootNodeIds,
    aliasToNodeIds: taxonomy.aliasToNodeIds,
    descendantsById: taxonomy.descendantsById,
    ancestorsById: taxonomy.ancestorsById,
    docsById,
    nodeToDocIds,
    tokenToDocIds,
    tokenDocumentFrequency,
    phraseToDocIds,
    docVectors,
    maxAdmissionPlan,
  }
}

function buildSearchDocument(
  record: NewDbRecord,
  taxonomy: TaxonomyGraph,
  maxAdmissionPlan: number,
): SearchDocument {
  const primaryText = `${record.specialty_name} ${record.university_name} ${record.location}`
  const classification = classifyTextToNodes(primaryText, taxonomy)
  const taxonomyNodeIds = uniqueTokens(classification.nodeIds.length > 0 ? classification.nodeIds : ["other"])
  const primaryTaxonomyNodeId = taxonomy.taxonomyById.has(classification.primaryNodeId)
    ? classification.primaryNodeId
    : "other"
  const rootTaxonomyNodeIds = uniqueTokens(
    classification.rootNodeIds.length > 0 ? classification.rootNodeIds : [primaryTaxonomyNodeId],
  )
  const taxonomyLabels = classification.taxonomyLabels.length > 0
    ? classification.taxonomyLabels
    : collectLabels([primaryTaxonomyNodeId], taxonomy)
  const taxonomyPath = classification.taxonomyPath.length > 0
    ? classification.taxonomyPath
    : taxonomy.taxonomyById.get(primaryTaxonomyNodeId)?.path ?? []
  const branchKey = classification.branchKey || `${rootTaxonomyNodeIds[0] ?? "other"}::${primaryTaxonomyNodeId}`

  const titleTokens = new Set(tokenize(record.specialty_name))
  const institutionTokens = new Set(tokenize(record.university_name))
  const cityTokens = new Set(tokenize(record.location))
  const codeTokens = new Set(tokenize(record.code))
  const studyFormTokens = new Set(tokenize(record.education_form))
  const studyTypeTokens = new Set(tokenize(record.education_type))
  const languageTokens = new Set(tokenize(record.language))

  const taxonomyTokens = new Set<string>()
  const aliasTokens = new Set<string>()

  for (const nodeId of taxonomyNodeIds) {
    const node = taxonomy.taxonomyById.get(nodeId)
    if (!node) continue

    for (const token of tokenize(node.label)) taxonomyTokens.add(token)
    for (const alias of node.aliases ?? []) {
      for (const token of tokenize(alias)) aliasTokens.add(token)
    }
    for (const keyword of node.keywords ?? []) {
      for (const token of tokenize(keyword)) aliasTokens.add(token)
    }
    for (const part of node.path ?? []) {
      for (const token of tokenize(part)) taxonomyTokens.add(token)
    }
  }

  const allTokens = new Set<string>([
    ...titleTokens,
    ...institutionTokens,
    ...cityTokens,
    ...codeTokens,
    ...studyFormTokens,
    ...studyTypeTokens,
    ...languageTokens,
    ...taxonomyTokens,
    ...aliasTokens,
  ])
  const searchText = normalizeText(
    [
      record.specialty_name,
      record.university_name,
      record.location,
      record.code,
      record.education_form,
      record.education_type,
      record.language,
      taxonomyLabels.join(" "),
      taxonomyPath.join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  )

  const semanticVector = buildSemanticVector([
    ...weightTerms([...titleTokens], 1.55),
    ...weightTerms([...taxonomyTokens], 1.35),
    ...weightTerms([...aliasTokens], 1.1),
    ...weightTerms([...codeTokens], 1.8),
    ...weightTerms([...institutionTokens], 0.35),
    ...weightTerms([...cityTokens], 0.2),
    ...weightTerms([...studyFormTokens], 0.25),
    ...weightTerms([...studyTypeTokens], 0.22),
    ...weightTerms([...languageTokens], 0.18),
    ...weightTerms(taxonomyPath.flatMap((part) => tokenize(part)), 0.95),
  ])

  return {
    id: buildDocumentId(record),
    code: record.code,
    title: record.specialty_name,
    institution: record.university_name,
    city: normalizeCity(record.location),
    location: record.location,
    searchText,
    cluster: record.cluster,
    educationLevel: record.education_level,
    educationForm: record.education_form,
    educationType: record.education_type,
    admissionPlan: record.admission_plan,
    sourcePage: record.source_page,
    taxonomyNodeIds,
    primaryTaxonomyNodeId,
    rootTaxonomyNodeIds,
    taxonomyLabels,
    taxonomyPath,
    branchKey,
    titleTokens,
    institutionTokens,
    cityTokens,
    codeTokens,
    taxonomyTokens,
    aliasTokens,
    studyFormTokens,
    studyTypeTokens,
    languageTokens,
    allTokens,
    semanticVector,
  }
}

function buildSearchQuery(input: SearchInput, index: SearchIndex): SearchQuery {
  const categoryText = (input.categories ?? [])
    .map((category) => [category.name, category.description ?? ""].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(" ")
  const keywordText = (input.keywords ?? []).join(" ")
  const raw = [input.query ?? "", categoryText, keywordText]
    .filter(Boolean)
    .join(" ")
    .trim()
  const normalized = normalizeText(raw)
  const tokens = uniqueTokens(tokenize(raw))
  const phrases = uniqueTokens([
    ...extractPhrases(raw),
    ...buildTokenNGrams(tokens, [2, 3]),
  ])
  const seedQuery = { normalized, tokens, phrases }

  const seedScores = resolveNodeSeeds(
    seedQuery,
    {
      taxonomyById: index.taxonomyById,
      rootNodeIds: index.rootNodeIds,
      aliasToNodeIds: index.aliasToNodeIds,
      descendantsById: index.descendantsById,
      ancestorsById: index.ancestorsById,
    },
  )

  const intent = detectIntent(raw, tokens, input.filters, seedScores)
  const seedNodeIds = [...seedScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([nodeId]) => nodeId)
  const expandedNodeIds = expandNodeSeeds(
    seedScores,
    {
      taxonomyById: index.taxonomyById,
      rootNodeIds: index.rootNodeIds,
      aliasToNodeIds: index.aliasToNodeIds,
      descendantsById: index.descendantsById,
      ancestorsById: index.ancestorsById,
    },
    intent,
  )
  const breadth = calculateBreadth(intent, tokens.length, seedNodeIds.length)
  const vector = buildQueryVector(
    tokens,
    phrases,
    seedNodeIds,
    expandedNodeIds,
    index,
  )

  return {
    raw,
    normalized,
    tokens,
    phrases,
    intent,
    seedNodeIds,
    expandedNodeIds,
    exclusionTokens: [],
    filters: normalizeFilters(input.filters),
    vector,
    breadth,
  }
}

function collectCandidateIds(query: SearchQuery, index: SearchIndex): string[] {
  const candidates = new Set<string>()
  const graph: TaxonomyGraph = {
    taxonomyById: index.taxonomyById,
    rootNodeIds: index.rootNodeIds,
    aliasToNodeIds: index.aliasToNodeIds,
    descendantsById: index.descendantsById,
    ancestorsById: index.ancestorsById,
  }

  for (const nodeId of query.expandedNodeIds) {
    for (const docId of index.nodeToDocIds.get(nodeId) ?? []) {
      candidates.add(docId)
    }
  }

  for (const token of query.tokens) {
    for (const docId of index.tokenToDocIds.get(token) ?? []) {
      candidates.add(docId)
    }
  }

  for (const phrase of query.phrases) {
    for (const docId of index.phraseToDocIds.get(phrase) ?? []) {
      candidates.add(docId)
    }
  }

  if (query.intent === "broad" || candidates.size < Math.max(120, query.tokens.length * 12)) {
    for (const docId of index.docsById.keys()) {
      candidates.add(docId)
    }
  }

  if (isCodeQuery(query.raw)) {
    const code = query.normalized.replace(/\s+/g, "")
    for (const doc of index.docsById.values()) {
      const normalizedCode = normalizeText(doc.code).replace(/\s+/g, "")
      if (normalizedCode.includes(code)) {
        candidates.add(doc.id)
      }
    }
  }

  if (query.intent === "comparison") {
    for (const rootId of graph.rootNodeIds) {
      for (const docId of index.nodeToDocIds.get(rootId) ?? []) {
        candidates.add(docId)
      }
    }
  }

  return [...candidates]
}

function scoreDocument(
  doc: SearchDocument,
  query: SearchQuery,
  index: SearchIndex,
): SearchCandidate {
  const lexicalScore = computeLexicalScore(doc, query, index)
  const semanticScore = cosineSimilarity(query.vector, doc.semanticVector)
  const taxonomyScore = computeTaxonomyScore(doc, query, index)
  const facetScore = computeFacetScore(doc, query)
  const qualityScore = computeQualityScore(doc, index)
  const weights = getWeightProfile(query)
  const breadthBonus = query.breadth > 0.8 && taxonomyScore > 0.85 ? 0.04 : 0
  const finalScore = clamp(
    lexicalScore * weights.lexical +
      semanticScore * weights.semantic +
      taxonomyScore * weights.taxonomy +
      facetScore * weights.facet +
      qualityScore * weights.quality +
      breadthBonus,
    0,
    1,
  )
  const confidence = clamp(finalScore, 0, 1)
  const matchedTokens = getMatchedTokens(doc, query)
  const matchedNodeIds = getMatchedNodeIds(doc, query, index)
  const matchedAliases = getMatchedAliases(doc, query)

  return {
    id: doc.id,
    code: doc.code,
    title: doc.title,
    institution: doc.institution,
    city: doc.city,
    cluster: doc.cluster,
    confidence,
    matchScore: lexicalScore,
    finalScore,
    lexicalScore,
    semanticScore,
    taxonomyScore,
    facetScore,
    qualityScore,
    matchedTokens,
    matchedNodeIds,
    matchedAliases,
    taxonomyPath: doc.taxonomyPath,
    taxonomyLabels: doc.taxonomyLabels,
    primaryTaxonomyNodeId: doc.primaryTaxonomyNodeId,
    rootTaxonomyNodeIds: doc.rootTaxonomyNodeIds,
    branchKey: doc.branchKey,
    searchIntent: query.intent,
    educationLevel: doc.educationLevel,
    educationForm: doc.educationForm,
    educationType: doc.educationType,
    admissionPlan: doc.admissionPlan,
    sourcePage: doc.sourcePage,
  }
}

function computeLexicalScore(
  doc: SearchDocument,
  query: SearchQuery,
  index: SearchIndex,
): number {
  if (query.tokens.length === 0) return 0

  const weights = new Map<string, number>()
  let denominator = 0

  for (const token of query.tokens) {
    const idf = getIdf(token, index)
    const weight = idf * (query.intent === "broad" ? 0.9 : 1)
    weights.set(token, weight)
    denominator += weight
  }

  let score = 0
  for (const [token, weight] of weights) {
    let fieldHit = 0
    if (doc.titleTokens.has(token)) fieldHit = 1
    else if (doc.taxonomyTokens.has(token)) fieldHit = 0.95
    else if (doc.aliasTokens.has(token)) fieldHit = 0.88
    else if (doc.codeTokens.has(token)) fieldHit = 1
    else if (doc.institutionTokens.has(token)) fieldHit = 0.42
    else if (doc.cityTokens.has(token)) fieldHit = 0.35
    else if (doc.studyFormTokens.has(token)) fieldHit = 0.44
    else if (doc.studyTypeTokens.has(token)) fieldHit = 0.4
    else if (doc.languageTokens.has(token)) fieldHit = 0.3
    else if (hasPrefixMatch(doc.titleTokens, token) || hasPrefixMatch(doc.taxonomyTokens, token)) {
      fieldHit = 0.72
    }

    score += weight * fieldHit
  }

  for (const phrase of query.phrases) {
    if (phrase.length < 3) continue
    if (doc.searchText.includes(phrase)) {
      score += Math.min(0.15 * phrase.split(" ").length, 0.4)
    }
  }

  return clamp(score / Math.max(denominator, 1), 0, 1)
}

function computeTaxonomyScore(
  doc: SearchDocument,
  query: SearchQuery,
  index: SearchIndex,
): number {
  const graph: TaxonomyGraph = {
    taxonomyById: index.taxonomyById,
    rootNodeIds: index.rootNodeIds,
    aliasToNodeIds: index.aliasToNodeIds,
    descendantsById: index.descendantsById,
    ancestorsById: index.ancestorsById,
  }

  let best = 0
  for (const queryNodeId of query.seedNodeIds) {
    for (const docNodeId of doc.taxonomyNodeIds) {
      best = Math.max(best, nodeAffinity(queryNodeId, docNodeId, graph))
    }
  }

  if (best === 0) {
    for (const queryNodeId of query.expandedNodeIds.slice(0, 16)) {
      for (const docNodeId of doc.taxonomyNodeIds) {
        best = Math.max(best, nodeAffinity(queryNodeId, docNodeId, graph) * 0.92)
      }
    }
  }

  if (best === 0 && query.intent === "broad") {
    const normalizedRaw = query.normalized
    for (const label of doc.taxonomyLabels) {
      if (normalizedRaw.includes(normalizeText(label))) {
        best = Math.max(best, 0.78)
      }
    }
  }

  return clamp(best, 0, 1)
}

function computeFacetScore(doc: SearchDocument, query: SearchQuery): number {
  const filters = query.filters
  if (!filters) return 0

  const scores: number[] = []

  if (filters.city && filters.city.length > 0) {
    const cityMatch = filters.city.some((city) => cityMatches(doc.city, city))
    scores.push(cityMatch ? 1 : 0)
  }

  if (filters.educationLevel && filters.educationLevel.length > 0) {
    scores.push(filters.educationLevel.includes(doc.educationLevel) ? 1 : 0)
  }

  if (filters.studyForm && filters.studyForm.length > 0) {
    const formMatch = filters.studyForm.some((form) => {
      const normalizedForm = normalizeText(form)
      return normalizeText(doc.educationForm).includes(normalizedForm)
    })
    scores.push(formMatch ? 1 : 0)
  }

  if (filters.studyType && filters.studyType.length > 0) {
    const typeMatch = filters.studyType.some((type) => {
      const normalizedType = normalizeText(type)
      return normalizeText(doc.educationType).includes(normalizedType)
    })
    scores.push(typeMatch ? 1 : 0)
  }

  if (filters.clusterIds && filters.clusterIds.length > 0) {
    scores.push(filters.clusterIds.includes(doc.cluster) ? 1 : 0)
  }

  if (scores.length === 0) return 0
  return scores.reduce((sum, value) => sum + value, 0) / scores.length
}

function computeQualityScore(
  doc: SearchDocument,
  index: SearchIndex,
): number {
  if (index.maxAdmissionPlan <= 0) return doc.admissionPlan > 0 ? 0.15 : 0
  const planScore = doc.admissionPlan > 0
    ? doc.admissionPlan / index.maxAdmissionPlan
    : 0
  return clamp(planScore, 0, 1)
}

function diversifyCandidates(
  candidates: SearchCandidate[],
  maxPerBranch: number,
): SearchCandidate[] {
  const counts = new Map<string, number>()
  const result: SearchCandidate[] = []

  for (const candidate of candidates) {
    const key = candidate.branchKey || `cluster:${candidate.cluster}`
    const count = counts.get(key) ?? 0

    if (count < maxPerBranch) {
      result.push(candidate)
      counts.set(key, count + 1)
    }
  }

  return result
}

function getMatchedTokens(doc: SearchDocument, query: SearchQuery): string[] {
  const tokens: string[] = []
  for (const token of query.tokens) {
    if (
      doc.titleTokens.has(token) ||
      doc.taxonomyTokens.has(token) ||
      doc.aliasTokens.has(token) ||
      doc.codeTokens.has(token) ||
      doc.studyFormTokens.has(token) ||
      doc.studyTypeTokens.has(token) ||
      doc.languageTokens.has(token) ||
      hasPrefixMatch(doc.titleTokens, token)
    ) {
      tokens.push(token)
    }
  }
  return uniqueTokens(tokens)
}

function getMatchedNodeIds(
  doc: SearchDocument,
  query: SearchQuery,
  index: SearchIndex,
): string[] {
  const matched: string[] = []
  const graph: TaxonomyGraph = {
    taxonomyById: index.taxonomyById,
    rootNodeIds: index.rootNodeIds,
    aliasToNodeIds: index.aliasToNodeIds,
    descendantsById: index.descendantsById,
    ancestorsById: index.ancestorsById,
  }

  for (const queryNodeId of query.seedNodeIds) {
    for (const docNodeId of doc.taxonomyNodeIds) {
      if (nodeAffinity(queryNodeId, docNodeId, graph) > 0.68) {
        matched.push(docNodeId)
      }
    }
  }

  return uniqueTokens(matched)
}

function getMatchedAliases(doc: SearchDocument, query: SearchQuery): string[] {
  const matches: string[] = []

  for (const phrase of query.phrases) {
    if (phrase.length > 2 && doc.searchText.includes(phrase)) {
      matches.push(phrase)
    }
  }

  for (const token of query.tokens) {
    if (doc.aliasTokens.has(token) || doc.taxonomyTokens.has(token)) {
      matches.push(token)
    }
  }

  return uniqueTokens(matches)
}

function candidateToMatchResult(candidate: SearchCandidate): NCTMatchResult {
  return {
    code: candidate.code,
    title_ru: candidate.title,
    institution: candidate.institution,
    city: candidate.city,
    confidence: candidate.confidence,
    career_matches: candidate.taxonomyLabels.slice(0, 4),
    matchScore: candidate.matchScore,
    finalScore: candidate.finalScore,
    matchedKeywords: candidate.matchedTokens,
    cluster: candidate.cluster,
    cluster_name_ru: candidate.taxonomyLabels[0] ?? candidate.title,
    study_form: candidate.educationForm ? [candidate.educationForm] : [],
    study_type: candidate.educationType ? [candidate.educationType] : [],
    taxonomyPath: candidate.taxonomyPath,
    matchedTaxonomyNodeIds: candidate.matchedNodeIds,
    primaryTaxonomyNodeId: candidate.primaryTaxonomyNodeId,
    branchKey: candidate.branchKey,
    lexicalScore: candidate.lexicalScore,
    semanticScore: candidate.semanticScore,
    taxonomyScore: candidate.taxonomyScore,
    facetScore: candidate.facetScore,
    qualityScore: candidate.qualityScore,
    searchIntent: candidate.searchIntent,
  }
}

function buildSemanticVector(features: Array<[string, number]>): Float32Array {
  const vector = new Float32Array(VECTOR_DIMENSION)

  for (const [feature, weight] of features) {
    const normalized = normalizeText(feature)
    if (!normalized) continue

    const tokens = tokenize(normalized)
    const sourceTokens = tokens.length > 0 ? tokens : [normalized]
    for (const token of sourceTokens) {
      addFeature(vector, token, weight)
    }
    for (const gram of buildTokenNGrams(sourceTokens, [2, 3])) {
      addFeature(vector, gram, weight * 0.65)
    }
  }

  normalizeVector(vector)
  return vector
}

function buildQueryVector(
  tokens: string[],
  phrases: string[],
  seedNodeIds: string[],
  expandedNodeIds: string[],
  index: SearchIndex,
): Float32Array {
  const features: Array<[string, number]> = []

  for (const token of tokens) {
    features.push([token, 1.2])
  }

  for (const phrase of phrases) {
    features.push([phrase, 1.4])
  }

  for (const nodeId of seedNodeIds.slice(0, 6)) {
    const node = index.taxonomyById.get(nodeId)
    if (!node) continue

    features.push([node.label, 1.65])
    for (const alias of (node.aliases ?? []).slice(0, 4)) {
      features.push([alias, 1])
    }
    for (const keyword of (node.keywords ?? []).slice(0, 4)) {
      features.push([keyword, 0.92])
    }
  }

  for (const nodeId of expandedNodeIds.slice(0, 8)) {
    const node = index.taxonomyById.get(nodeId)
    if (!node) continue
    features.push([node.label, 0.6])
  }

  return buildSemanticVector(features)
}

function getWeightProfile(query: SearchQuery): {
  lexical: number
  semantic: number
  taxonomy: number
  facet: number
  quality: number
} {
  if (query.intent === "comparison") {
    return { lexical: 0.26, semantic: 0.25, taxonomy: 0.24, facet: 0.08, quality: 0.17 }
  }

  if (query.intent === "facet") {
    return { lexical: 0.22, semantic: 0.18, taxonomy: 0.18, facet: 0.32, quality: 0.1 }
  }

  const broadBlend = clamp(query.breadth, 0, 1)
  const lexical = lerp(0.34, 0.18, broadBlend)
  const semantic = lerp(0.23, 0.31, broadBlend)
  const taxonomy = lerp(0.2, 0.35, broadBlend)
  const facet = lerp(0.12, 0.08, broadBlend)
  const quality = 1 - lexical - semantic - taxonomy - facet

  return { lexical, semantic, taxonomy, facet, quality }
}

function detectIntent(
  raw: string,
  tokens: string[],
  filters?: SearchFilters,
  seedScores?: Map<string, number>,
): SearchIntent {
  const normalized = normalizeText(raw)
  if (isCodeQuery(raw) || /\b\d{2}(?:\.\d{2}){1,2}\b/.test(raw)) {
    return "code"
  }

  if (/\b(vs\.?|против|сравни|compare|comparison)\b/i.test(normalized)) {
    return "comparison"
  }

  const hasFilters = Boolean(
    filters &&
      (filters.city?.length || filters.educationLevel?.length || filters.studyForm?.length || filters.studyType?.length),
  )
  if (hasFilters && tokens.length <= 4) {
    return "facet"
  }

  const rootHit = seedScores
    ? [...seedScores.keys()].some((nodeId) => nodeId && nodeId.split(".").length === 1)
    : false
  if (tokens.length <= 2 || rootHit) {
    return "broad"
  }

  return "narrow"
}

function calculateBreadth(
  intent: SearchIntent,
  tokenCount: number,
  seedCount: number,
): number {
  if (intent === "broad") return 1
  if (intent === "facet") return 0.45
  if (intent === "comparison") return 0.35
  if (tokenCount <= 1) return 0.85
  if (seedCount <= 1) return 0.72
  if (tokenCount <= 3) return 0.55
  return 0.38
}

function normalizeFilters(filters?: SearchFilters): SearchFilters {
  return {
    city: uniqueTokens((filters?.city ?? []).map((value) => normalizeCity(value))),
    educationLevel: filters?.educationLevel?.length ? [...filters.educationLevel] : undefined,
    studyForm: uniqueTokens((filters?.studyForm ?? []).map((value) => normalizeText(value))),
    studyType: uniqueTokens((filters?.studyType ?? []).map((value) => normalizeText(value))),
    clusterIds: filters?.clusterIds?.length ? [...filters.clusterIds] : undefined,
  }
}

function cityMatches(docCity: string, queryCity: string): boolean {
  const normalizedDoc = normalizeCity(docCity)
  const normalizedQuery = normalizeCity(queryCity)
  return (
    normalizedDoc === normalizedQuery ||
    normalizedDoc.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedDoc)
  )
}

function addPosting(
  map: Map<string, Set<string>>,
  key: string,
  docId: string,
): void {
  if (!key) return
  const existing = map.get(key)
  if (existing) {
    existing.add(docId)
  } else {
    map.set(key, new Set([docId]))
  }
}

function addDocToNode(
  map: Map<string, string[]>,
  nodeId: string,
  docId: string,
): void {
  const existing = map.get(nodeId)
  if (existing) {
    if (!existing.includes(docId)) existing.push(docId)
  } else {
    map.set(nodeId, [docId])
  }
}

function buildDocumentId(record: NewDbRecord): string {
  return `${record.code}::${hashString([
    record.code,
    record.specialty_name,
    record.university_name,
    record.location,
    record.source_page.toString(),
  ].join("|"))}`
}

function hashString(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function weightTerms(tokens: string[], weight: number): Array<[string, number]> {
  return tokens.map((token) => [token, weight] as [string, number])
}

function addFeature(vector: Float32Array, feature: string, weight: number): void {
  const hash = hashFeature(feature)
  const primaryIndex = hash % VECTOR_DIMENSION
  const secondaryIndex = (hash >>> 11) % VECTOR_DIMENSION
  const sign = hash & 1 ? 1 : -1

  vector[primaryIndex] += sign * weight
  vector[secondaryIndex] += sign * weight * 0.5
}

function hashFeature(feature: string): number {
  let hash = 2166136261
  for (let index = 0; index < feature.length; index += 1) {
    hash ^= feature.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function normalizeVector(vector: Float32Array): void {
  let sumSquares = 0
  for (const value of vector) {
    sumSquares += value * value
  }

  const norm = Math.sqrt(sumSquares)
  if (norm === 0) return

  for (let index = 0; index < vector.length; index += 1) {
    vector[index] /= norm
  }
}

function cosineSimilarity(left: Float32Array, right: Float32Array): number {
  let dot = 0
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index]
  }
  return clamp(dot, 0, 1)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function getIdf(token: string, index: SearchIndex): number {
  const df = index.tokenDocumentFrequency.get(token) ?? 0
  return Math.log((index.manifest.documentCount + 1) / (df + 1)) + 1
}

function hasPrefixMatch(tokens: Set<string>, token: string): boolean {
  for (const candidate of tokens) {
    if (candidate.startsWith(token) || token.startsWith(candidate)) {
      return true
    }
  }
  return false
}
