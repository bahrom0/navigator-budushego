import {
  buildTokenNGrams,
  canonicalizeToken,
  extractPhrases,
  normalizeText,
  tokenize,
  uniqueTokens,
} from "./normalize"
import type {
  SearchIntent,
  SearchQuery,
  TaxonomyNode,
  TaxonomyNodeSpec,
  TaxonomyRule,
} from "./types"

export const TAXONOMY_VERSION = "2026-07-hybrid-v1"

const ROOT_SPECS: TaxonomyNodeSpec[] = [
  {
    id: "it",
    parentId: null,
    label: "IT и технологии",
    aliases: ["it", "информатика", "компьютерные технологии", "software", "technology"],
    keywords: ["программирование", "данные", "цифровые технологии", "компьютер", "web"],
  },
  {
    id: "medicine",
    parentId: null,
    label: "Медицина и здоровье",
    aliases: ["медицина", "здравоохранение", "medical", "medicine", "health"],
    keywords: ["лечение", "врач", "диагностика", "фармация", "стоматология", "биология"],
  },
  {
    id: "economics",
    parentId: null,
    label: "Экономика и бизнес",
    aliases: ["экономика", "business", "finance", "бизнес"],
    keywords: ["финансы", "бухгалтерия", "маркетинг", "менеджмент", "торговля", "логистика"],
  },
  {
    id: "pedagogy",
    parentId: null,
    label: "Педагогика и образование",
    aliases: ["педагогика", "education", "обучение", "teacher"],
    keywords: ["образование", "учитель", "дошкольное", "начальное образование"],
  },
  {
    id: "law",
    parentId: null,
    label: "Право и юриспруденция",
    aliases: ["право", "law", "jurisprudence", "legal"],
    keywords: ["юриспруденция", "правоохранение", "международное право", "правоведение"],
  },
  {
    id: "engineering",
    parentId: null,
    label: "Инженерия и техника",
    aliases: ["инженерия", "engineering", "техника", "technical"],
    keywords: ["инженер", "машиностроение", "автоматизация", "строительство", "технологии"],
  },
  {
    id: "art",
    parentId: null,
    label: "Искусство и дизайн",
    aliases: ["искусство", "art", "design", "media"],
    keywords: ["дизайн", "журналистика", "музыка", "театр", "кино", "культура"],
  },
  {
    id: "linguistics",
    parentId: null,
    label: "Лингвистика и языки",
    aliases: ["лингвистика", "language", "translation", "philology"],
    keywords: ["язык", "перевод", "филология", "иностранные языки"],
  },
  {
    id: "agronomy",
    parentId: null,
    label: "Агрономия и естественные науки",
    aliases: ["агрономия", "agriculture", "natural sciences"],
    keywords: ["агрономия", "экология", "лес", "зоотехния", "пчеловодство"],
  },
  {
    id: "psychology",
    parentId: null,
    label: "Психология и социология",
    aliases: ["психология", "psychology", "mental health"],
    keywords: ["психолог", "социология", "консультирование", "семейные отношения"],
  },
  {
    id: "architecture",
    parentId: null,
    label: "Архитектура и урбанистика",
    aliases: ["архитектура", "architecture", "urban", "urbanism"],
    keywords: ["архитектура", "градостроительство", "дизайн среды"],
  },
  {
    id: "marketing",
    parentId: null,
    label: "Маркетинг и коммуникации",
    aliases: ["маркетинг", "marketing", "advertising", "branding"],
    keywords: ["реклама", "брендинг", "коммуникации", "digital"],
  },
  {
    id: "construction",
    parentId: null,
    label: "Строительство и инфраструктура",
    aliases: ["строительство", "construction", "infrastructure"],
    keywords: ["дорожное строительство", "инфраструктура", "проектирование"],
  },
  {
    id: "energy",
    parentId: null,
    label: "Энергетика и ресурсы",
    aliases: ["энергетика", "energy", "power", "oil gas"],
    keywords: ["электроэнергетика", "нефть", "газ", "возобновляемая энергия"],
  },
  {
    id: "management",
    parentId: null,
    label: "Менеджмент и управление",
    aliases: ["менеджмент", "management", "leadership", "administration"],
    keywords: ["управление", "операции", "проектное управление", "hr"],
  },
  {
    id: "other",
    parentId: null,
    label: "Другое",
    aliases: ["другое", "other", "misc"],
    keywords: ["прочее"],
  },
]

const CHILD_SPECS: TaxonomyNodeSpec[] = [
  { id: "it.software", parentId: "it", label: "Разработка ПО", aliases: ["software", "программирование", "разработка"], keywords: ["frontend", "backend", "web", "код"] },
  { id: "it.data", parentId: "it", label: "Данные и аналитика", aliases: ["data", "analytics", "данные"], keywords: ["аналитика", "искусственный интеллект", "машинное обучение", "bi"] },
  { id: "it.security", parentId: "it", label: "Кибербезопасность", aliases: ["security", "cybersecurity", "безопасность"], keywords: ["кибер", "информационная безопасность"] },
  { id: "it.networks", parentId: "it", label: "Сети и телеком", aliases: ["network", "telecom", "сети"], keywords: ["телеком", "интернет", "сетевые технологии"] },
  { id: "it.automation", parentId: "it", label: "Автоматизация", aliases: ["automation", "автоматизация"], keywords: ["робототехника", "embedded", "системы управления"] },
  { id: "it.design", parentId: "it", label: "UX/UI и дизайн интерфейсов", aliases: ["ux", "ui", "design"], keywords: ["web-дизайн", "графический дизайн", "интерфейсы"] },

  { id: "medicine.clinical", parentId: "medicine", label: "Клиническая медицина", aliases: ["clinical", "медицинская практика"], keywords: ["лечебное дело", "терапия", "хирургия", "педиатрия", "акушерство"] },
  { id: "medicine.dentistry", parentId: "medicine", label: "Стоматология", aliases: ["dentistry", "стоматология", "dental"], keywords: ["зуб", "стомат", "кариес"] },
  { id: "medicine.pharmacy", parentId: "medicine", label: "Фармация", aliases: ["pharmacy", "фармация"], keywords: ["фармацевтическая", "аптека", "лекарства"] },
  { id: "medicine.veterinary", parentId: "medicine", label: "Ветеринария", aliases: ["veterinary", "ветеринария"], keywords: ["ветеринар", "животные", "ветмедицина"] },
  { id: "medicine.biology", parentId: "medicine", label: "Биология", aliases: ["biology", "биология"], keywords: ["молекулярная биология", "генетика", "микробиология"] },
  { id: "medicine.chemistry", parentId: "medicine", label: "Химия и биохимия", aliases: ["chemistry", "biochemistry", "химия"], keywords: ["биохим", "фармацевтич", "лаборатор"] },
  { id: "medicine.public-health", parentId: "medicine", label: "Здравоохранение", aliases: ["public health", "здравоохранение"], keywords: ["санитар", "эпидемиология", "гигиена"] },
  { id: "medicine.rehabilitation", parentId: "medicine", label: "Реабилитация", aliases: ["rehabilitation", "реабилитация"], keywords: ["физиотерапия", "массаж", "восстановление"] },

  { id: "economics.finance", parentId: "economics", label: "Финансы и банки", aliases: ["finance", "banking", "финансы"], keywords: ["банк", "кредит", "страхование"] },
  { id: "economics.accounting", parentId: "economics", label: "Бухгалтерия и аудит", aliases: ["accounting", "audit", "бухгалтерия"], keywords: ["бухгалтерский учет", "налоги", "ревизия"] },
  { id: "economics.management", parentId: "economics", label: "Бизнес-менеджмент", aliases: ["management", "business management"], keywords: ["менеджмент", "управление", "корпоративный"] },
  { id: "economics.marketing", parentId: "economics", label: "Маркетинг", aliases: ["marketing", "маркетинг"], keywords: ["реклама", "бренд", "digital"] },
  { id: "economics.logistics", parentId: "economics", label: "Логистика", aliases: ["logistics", "логистика"], keywords: ["транспортная логистика", "склад", "цепочки поставок"] },
  { id: "economics.tourism", parentId: "economics", label: "Туризм и гостеприимство", aliases: ["tourism", "hospitality"], keywords: ["туризм", "гостеприимство"] },
  { id: "economics.customs", parentId: "economics", label: "Таможенное дело", aliases: ["customs", "таможня"], keywords: ["таможенное дело", "импорт", "экспорт"] },
  { id: "economics.trade", parentId: "economics", label: "Торговля и товароведение", aliases: ["trade", "commodity science"], keywords: ["товароведение", "экспертиза", "торговля"] },

  { id: "pedagogy.preschool", parentId: "pedagogy", label: "Дошкольное образование", aliases: ["preschool", "дошкольное"], keywords: ["детский сад", "раннее развитие"] },
  { id: "pedagogy.primary", parentId: "pedagogy", label: "Начальное образование", aliases: ["primary education", "начальное образование"], keywords: ["начальная школа"] },
  { id: "pedagogy.languages", parentId: "pedagogy", label: "Языковое образование", aliases: ["language teaching", "языковое"], keywords: ["иностранный язык", "преподавание языка"] },
  { id: "pedagogy.special", parentId: "pedagogy", label: "Специальная педагогика", aliases: ["special education", "специальная педагогика"], keywords: ["коррекционное", "дефектология"] },
  { id: "pedagogy.management", parentId: "pedagogy", label: "Управление образованием", aliases: ["education management", "управление образованием"], keywords: ["администрирование", "школа", "университет"] },

  { id: "law.jurisprudence", parentId: "law", label: "Юриспруденция", aliases: ["jurisprudence", "law", "правоведение"], keywords: ["право", "юрист"] },
  { id: "law.international", parentId: "law", label: "Международное право", aliases: ["international law", "международное право"], keywords: ["дипломатия", "международные отношения"] },
  { id: "law.enforcement", parentId: "law", label: "Правоохранительная деятельность", aliases: ["law enforcement", "правоохранительная"], keywords: ["полиция", "служба безопасности"] },
  { id: "law.tax", parentId: "law", label: "Налоговое право", aliases: ["tax law", "налоговое"], keywords: ["налоги", "налогообложение"] },
  { id: "law.transport", parentId: "law", label: "Транспортное право", aliases: ["transport law", "транспортное"], keywords: ["логистика", "перевозки"] },

  { id: "engineering.mechanical", parentId: "engineering", label: "Машиностроение", aliases: ["mechanical engineering", "машиностроение"], keywords: ["станки", "механика"] },
  { id: "engineering.electrical", parentId: "engineering", label: "Электротехника", aliases: ["electrical engineering", "электротехника"], keywords: ["электрические", "электроэнергия"] },
  { id: "engineering.automation", parentId: "engineering", label: "Автоматизированные системы", aliases: ["automation", "автоматизированные системы"], keywords: ["автоматизация", "релейная защита"] },
  { id: "engineering.civil", parentId: "engineering", label: "Инфраструктурная инженерия", aliases: ["civil engineering", "infrastructure"], keywords: ["дороги", "мосты", "инфраструктура"] },
  { id: "engineering.transport", parentId: "engineering", label: "Транспорт и перевозки", aliases: ["transport engineering", "транспорт"], keywords: ["вагоны", "автомобильные перевозки"] },
  { id: "engineering.geodesy", parentId: "engineering", label: "Геодезия и кадастр", aliases: ["geodesy", "cadastral"], keywords: ["геодезия", "землеустройство", "кадастр"] },
  { id: "engineering.geology", parentId: "engineering", label: "Геология и разведка", aliases: ["geology", "exploration"], keywords: ["геология", "разведка", "гидрогеология"] },
  { id: "engineering.safety", parentId: "engineering", label: "Промышленная безопасность", aliases: ["safety engineering", "безопасность"], keywords: ["охрана труда", "технологическая безопасность"] },

  { id: "art.graphic", parentId: "art", label: "Графический и web-дизайн", aliases: ["graphic design", "web design", "графический дизайн"], keywords: ["компьютерная графика", "ui", "ux"] },
  { id: "art.media", parentId: "art", label: "Медиа и коммуникации", aliases: ["media", "communication"], keywords: ["web-журналистика", "информация и коммуникация"] },
  { id: "art.music", parentId: "art", label: "Музыка", aliases: ["music", "music arts"], keywords: ["пение", "музыкальное искусство"] },
  { id: "art.theatre", parentId: "art", label: "Театр и режиссура", aliases: ["theatre", "drama"], keywords: ["режиссура", "театральные"] },
  { id: "art.cinema", parentId: "art", label: "Кино и телевидение", aliases: ["cinema", "film", "tv"], keywords: ["кинотелеоператорство", "телевидение"] },
  { id: "art.journalism", parentId: "art", label: "Журналистика", aliases: ["journalism", "journalist"], keywords: ["журналистика", "редактура"] },
  { id: "art.culture", parentId: "art", label: "Культурология", aliases: ["cultural studies", "culture"], keywords: ["культурология", "музейное дело", "история культуры"] },
  { id: "art.design", parentId: "art", label: "Дизайн", aliases: ["design", "дизайн"], keywords: ["дизайн текстильных изделий", "дизайн швейных изделий"] },

  { id: "linguistics.translation", parentId: "linguistics", label: "Перевод и переводоведение", aliases: ["translation", "interpreting", "перевод"], keywords: ["переводчик"] },
  { id: "linguistics.philology", parentId: "linguistics", label: "Филология", aliases: ["philology", "филология"], keywords: ["русский язык и литература"] },
  { id: "linguistics.language-teaching", parentId: "linguistics", label: "Преподавание языков", aliases: ["language teaching", "преподавание языка"], keywords: ["иностранный язык", "лингвистическое обеспечение"] },
  { id: "linguistics.interpreting", parentId: "linguistics", label: "Устный перевод", aliases: ["interpreting", "устный перевод"], keywords: ["синхронный перевод"] },

  { id: "agronomy.agriculture", parentId: "agronomy", label: "Сельское хозяйство", aliases: ["agriculture", "сельское хозяйство"], keywords: ["агрономия", "плодоовощеводство"] },
  { id: "agronomy.ecology", parentId: "agronomy", label: "Экология", aliases: ["ecology", "экология"], keywords: ["биоэкология", "общая экология"] },
  { id: "agronomy.forestry", parentId: "agronomy", label: "Лесное дело", aliases: ["forestry", "лесоведение"], keywords: ["лесоводство", "лесное хозяйство"] },
  { id: "agronomy.crop", parentId: "agronomy", label: "Растениеводство", aliases: ["crop production", "растениеводство"], keywords: ["плодоовощеводство", "полевые культуры"] },
  { id: "agronomy.livestock", parentId: "agronomy", label: "Животноводство", aliases: ["livestock", "animal husbandry"], keywords: ["зоотехния", "животноводство"] },
  { id: "agronomy.soil-water", parentId: "agronomy", label: "Почва и вода", aliases: ["soil", "water management"], keywords: ["мелиорация", "водное хозяйство"] },

  { id: "psychology.clinical", parentId: "psychology", label: "Клиническая психология", aliases: ["clinical psychology", "клиническая психология"], keywords: ["психологическая помощь"] },
  { id: "psychology.social", parentId: "psychology", label: "Социальная психология", aliases: ["social psychology", "социальная психология"], keywords: ["социальные отношения"] },
  { id: "psychology.family", parentId: "psychology", label: "Семейная психология", aliases: ["family psychology", "семейная"], keywords: ["психология семейных отношений"] },
  { id: "psychology.counseling", parentId: "psychology", label: "Консультирование", aliases: ["counseling", "консультирование"], keywords: ["психолог-консультант"] },

  { id: "architecture.design", parentId: "architecture", label: "Архитектурный дизайн", aliases: ["architectural design", "архитектурный дизайн"], keywords: ["дизайн среды"] },
  { id: "architecture.urban", parentId: "architecture", label: "Урбанистика", aliases: ["urban planning", "урбанистика"], keywords: ["городское планирование"] },
  { id: "architecture.construction", parentId: "architecture", label: "Архитектура и строительство", aliases: ["architecture and construction", "архитектура"], keywords: ["проектирование зданий"] },

  { id: "marketing.digital", parentId: "marketing", label: "Digital-маркетинг", aliases: ["digital marketing", "маркетинг"], keywords: ["internet marketing", "продвижение"] },
  { id: "marketing.branding", parentId: "marketing", label: "Брендинг", aliases: ["branding", "брендинг"], keywords: ["бренд", "brand strategy"] },
  { id: "marketing.advertising", parentId: "marketing", label: "Реклама и PR", aliases: ["advertising", "pr"], keywords: ["реклама", "коммуникации"] },

  { id: "construction.civil", parentId: "construction", label: "Гражданское строительство", aliases: ["civil construction", "гражданское строительство"], keywords: ["инженерные сооружения"] },
  { id: "construction.project", parentId: "construction", label: "Строительное проектирование", aliases: ["construction project", "строительное проектирование"], keywords: ["проектирование", "сметы"] },
  { id: "construction.safety", parentId: "construction", label: "Безопасность строительства", aliases: ["construction safety", "безопасность строительства"], keywords: ["охрана труда", "строительные нормы"] },

  { id: "energy.power", parentId: "energy", label: "Электроэнергетика", aliases: ["power engineering", "энергетика"], keywords: ["электричество", "силовые установки"] },
  { id: "energy.renewable", parentId: "energy", label: "Возобновляемая энергия", aliases: ["renewable energy", "возобновляемая"], keywords: ["солнечная", "ветровая"] },
  { id: "energy.oil-gas", parentId: "energy", label: "Нефть и газ", aliases: ["oil and gas", "нефть", "газ"], keywords: ["нефтегаз", "бурение"] },

  { id: "management.public", parentId: "management", label: "Государственное управление", aliases: ["public administration", "государственное управление"], keywords: ["госслужба", "политика"] },
  { id: "management.project", parentId: "management", label: "Проектное управление", aliases: ["project management", "проектное управление"], keywords: ["операционное управление"] },
  { id: "management.hr", parentId: "management", label: "HR и персонал", aliases: ["human resources", "hr"], keywords: ["кадры", "персонал"] },
  { id: "management.operations", parentId: "management", label: "Операционное управление", aliases: ["operations management", "операционный менеджмент"], keywords: ["процессы", "производственный менеджмент"] },
]

const DOCUMENT_RULES: TaxonomyRule[] = [
  { nodeId: "it", patterns: [/информат/i, /компьютер/i, /программ/i, /software/i, /web/i, /data/i, /автомат/i], weight: 1.2 },
  { nodeId: "it.software", patterns: [/программ/i, /software/i, /web/i, /frontend/i, /backend/i, /разработ/i], weight: 2.2 },
  { nodeId: "it.data", patterns: [/данн/i, /аналит/i, /data/i, /интеллект/i, /машинн/i, /bi/i], weight: 2.2 },
  { nodeId: "it.security", patterns: [/кибер/i, /безопас/i, /security/i], weight: 2.1 },
  { nodeId: "it.networks", patterns: [/сет/i, /network/i, /телеком/i, /internet/i], weight: 2.0 },
  { nodeId: "it.automation", patterns: [/автомат/i, /робот/i, /управлени/i], weight: 2.0 },
  { nodeId: "it.design", patterns: [/ux/i, /ui/i, /web-дизайн/i, /графичес/i, /интерфейс/i], weight: 2.0 },

  { nodeId: "medicine", patterns: [/медицин/i, /здравоохран/i, /лечеб/i, /фарма/i, /стомат/i, /ветерин/i, /биологи/i, /хим/i], weight: 1.2 },
  { nodeId: "medicine.clinical", patterns: [/лечеб/i, /терап/i, /хирург/i, /педиатр/i, /акушер/i, /клиничес/i], weight: 2.4 },
  { nodeId: "medicine.dentistry", patterns: [/стомат/i, /зуб/i, /dental/i], weight: 2.4 },
  { nodeId: "medicine.pharmacy", patterns: [/фарма/i, /апте/i, /pharm/i], weight: 2.3 },
  { nodeId: "medicine.veterinary", patterns: [/ветерин/i, /vet/i], weight: 2.2 },
  { nodeId: "medicine.biology", patterns: [/биологи/i, /генет/i, /микроби/i], weight: 2.0 },
  { nodeId: "medicine.chemistry", patterns: [/биохим/i, /хим/i, /лаборатор/i], weight: 1.8 },
  { nodeId: "medicine.public-health", patterns: [/санитар/i, /эпидеми/i, /гигиен/i, /здравоохран/i], weight: 2.0 },
  { nodeId: "medicine.rehabilitation", patterns: [/реабилит/i, /физиотерап/i, /массаж/i], weight: 2.0 },

  { nodeId: "economics", patterns: [/эконом/i, /финанс/i, /бизнес/i, /маркет/i, /менеджмент/i, /банк/i, /аудит/i, /логист/i, /туризм/i], weight: 1.1 },
  { nodeId: "economics.finance", patterns: [/финанс/i, /банк/i, /credit/i, /страхов/i], weight: 2.1 },
  { nodeId: "economics.accounting", patterns: [/бухгалтер/i, /налог/i, /аудит/i, /ревиз/i], weight: 2.2 },
  { nodeId: "economics.management", patterns: [/менеджмент/i, /управлен/i, /администр/i], weight: 2.2 },
  { nodeId: "economics.marketing", patterns: [/маркет/i, /реклам/i, /бренд/i], weight: 2.2 },
  { nodeId: "economics.logistics", patterns: [/логист/i, /транспорт/i, /склад/i], weight: 2.0 },
  { nodeId: "economics.tourism", patterns: [/туризм/i, /гостеприим/i], weight: 2.0 },
  { nodeId: "economics.customs", patterns: [/тамож/i], weight: 2.2 },
  { nodeId: "economics.trade", patterns: [/товаровед/i, /торгов/i], weight: 2.0 },

  { nodeId: "pedagogy", patterns: [/педагог/i, /образован/i, /учител/i, /дошколь/i, /начальн/i], weight: 1.1 },
  { nodeId: "pedagogy.preschool", patterns: [/дошколь/i, /детск/i, /preschool/i], weight: 2.2 },
  { nodeId: "pedagogy.primary", patterns: [/начальн/i, /primary/i], weight: 2.0 },
  { nodeId: "pedagogy.languages", patterns: [/иностранн/i, /language teaching/i, /язык/i], weight: 2.0 },
  { nodeId: "pedagogy.special", patterns: [/коррекц/i, /special education/i, /дефектолог/i], weight: 2.0 },
  { nodeId: "pedagogy.management", patterns: [/управлени.*образован/i, /education management/i], weight: 2.0 },

  { nodeId: "law", patterns: [/право/i, /юрист/i, /юрис/i, /правоохран/i, /law/i], weight: 1.1 },
  { nodeId: "law.jurisprudence", patterns: [/правоведен/i, /юриспруден/i, /law/i], weight: 2.2 },
  { nodeId: "law.international", patterns: [/международн.*прав/i, /international law/i], weight: 2.2 },
  { nodeId: "law.enforcement", patterns: [/правоохран/i, /police/i], weight: 2.1 },
  { nodeId: "law.tax", patterns: [/налогов.*прав/i, /tax law/i], weight: 2.1 },
  { nodeId: "law.transport", patterns: [/транспортн.*прав/i], weight: 2.0 },

  { nodeId: "engineering", patterns: [/инженер/i, /техническ/i, /строител/i, /электро/i, /автомат/i, /машиност/i], weight: 1.0 },
  { nodeId: "engineering.mechanical", patterns: [/машиност/i, /механик/i, /станк/i], weight: 2.2 },
  { nodeId: "engineering.electrical", patterns: [/электро/i, /силов/i, /энергетич/i], weight: 2.0 },
  { nodeId: "engineering.automation", patterns: [/автоматиза/i, /релейн/i, /автоматизирован/i], weight: 2.2 },
  { nodeId: "engineering.civil", patterns: [/строител/i, /инфраструктур/i, /мост/i, /дорог/i], weight: 2.1 },
  { nodeId: "engineering.transport", patterns: [/вагон/i, /перевоз/i, /транспорт/i], weight: 2.0 },
  { nodeId: "engineering.geodesy", patterns: [/геодез/i, /кадастр/i, /землеустрой/i], weight: 2.1 },
  { nodeId: "engineering.geology", patterns: [/геолог/i, /гидрогеолог/i, /разведк/i], weight: 2.1 },
  { nodeId: "engineering.safety", patterns: [/безопасност/i, /охрана труда/i], weight: 1.9 },

  { nodeId: "art", patterns: [/дизайн/i, /журналист/i, /искусств/i, /музык/i, /театр/i, /кино/i, /культур/i], weight: 1.1 },
  { nodeId: "art.graphic", patterns: [/web-дизайн/i, /графическ/i, /компьютерн.*график/i], weight: 2.3 },
  { nodeId: "art.media", patterns: [/коммуникац/i, /информац/i, /web-журналист/i], weight: 2.0 },
  { nodeId: "art.music", patterns: [/музык/i, /пение/i], weight: 2.1 },
  { nodeId: "art.theatre", patterns: [/режисс/i, /театр/i], weight: 2.1 },
  { nodeId: "art.cinema", patterns: [/кино/i, /телевид/i], weight: 2.1 },
  { nodeId: "art.journalism", patterns: [/журналист/i], weight: 2.2 },
  { nodeId: "art.culture", patterns: [/культуролог/i, /музей/i], weight: 2.0 },
  { nodeId: "art.design", patterns: [/дизайн/i, /текстиль/i, /швейн/i], weight: 2.2 },

  { nodeId: "linguistics", patterns: [/язык/i, /перевод/i, /лингвист/i, /филолог/i], weight: 1.1 },
  { nodeId: "linguistics.translation", patterns: [/перевод/i, /interpreting/i], weight: 2.2 },
  { nodeId: "linguistics.philology", patterns: [/филолог/i, /русский язык/i], weight: 2.1 },
  { nodeId: "linguistics.language-teaching", patterns: [/иностранн.*язык/i, /преподаван.*язык/i], weight: 2.1 },
  { nodeId: "linguistics.interpreting", patterns: [/синхрон/i, /устн.*перевод/i], weight: 2.0 },

  { nodeId: "agronomy", patterns: [/агроном/i, /сельск/i, /эколог/i, /лес/i, /зоотех/i, /пчеловод/i], weight: 1.1 },
  { nodeId: "agronomy.agriculture", patterns: [/агроном/i, /сельск/i], weight: 2.2 },
  { nodeId: "agronomy.ecology", patterns: [/эколог/i, /биоэколог/i], weight: 2.1 },
  { nodeId: "agronomy.forestry", patterns: [/лесовед/i, /лесовод/i], weight: 2.0 },
  { nodeId: "agronomy.crop", patterns: [/плодоовощ/i, /растениевод/i], weight: 2.0 },
  { nodeId: "agronomy.livestock", patterns: [/зоотех/i, /животновод/i], weight: 2.0 },
  { nodeId: "agronomy.soil-water", patterns: [/мелиорац/i, /водн.*хозяйств/i], weight: 1.9 },

  { nodeId: "psychology", patterns: [/психолог/i, /социолог/i, /консульт/i], weight: 1.1 },
  { nodeId: "psychology.clinical", patterns: [/клиническ.*психолог/i], weight: 2.0 },
  { nodeId: "psychology.social", patterns: [/социальн.*психолог/i], weight: 2.0 },
  { nodeId: "psychology.family", patterns: [/семейн.*психолог/i], weight: 2.0 },
  { nodeId: "psychology.counseling", patterns: [/консульт/i], weight: 1.9 },

  { nodeId: "architecture", patterns: [/архитект/i, /урбан/i, /дизайн среды/i], weight: 1.1 },
  { nodeId: "architecture.design", patterns: [/архитектурн.*дизайн/i, /design/i], weight: 2.0 },
  { nodeId: "architecture.urban", patterns: [/урбан/i, /градостро/i], weight: 2.0 },
  { nodeId: "architecture.construction", patterns: [/проектирован.*здан/i, /архитектур/i], weight: 1.9 },

  { nodeId: "marketing", patterns: [/маркетинг/i, /реклам/i, /бренд/i, /pr/i], weight: 1.1 },
  { nodeId: "marketing.digital", patterns: [/digital/i, /internet marketing/i, /онлайн маркет/i], weight: 2.0 },
  { nodeId: "marketing.branding", patterns: [/бренд/i, /branding/i], weight: 2.0 },
  { nodeId: "marketing.advertising", patterns: [/реклам/i, /pr/i], weight: 2.0 },

  { nodeId: "construction", patterns: [/строител/i, /инфраструктур/i, /дорож/i], weight: 1.0 },
  { nodeId: "construction.civil", patterns: [/гражданск.*строител/i], weight: 2.0 },
  { nodeId: "construction.project", patterns: [/проектирован/i, /смет/i], weight: 1.9 },
  { nodeId: "construction.safety", patterns: [/строительн.*безопас/i, /охрана труда/i], weight: 1.9 },

  { nodeId: "energy", patterns: [/энергет/i, /электрич/i, /нефть/i, /газ/i], weight: 1.1 },
  { nodeId: "energy.power", patterns: [/электроэнерг/i, /силов/i], weight: 2.0 },
  { nodeId: "energy.renewable", patterns: [/возобновляем/i, /солнечн/i, /ветров/i], weight: 2.0 },
  { nodeId: "energy.oil-gas", patterns: [/нефтегаз/i, /бурен/i, /газ/i], weight: 2.0 },

  { nodeId: "management", patterns: [/управлен/i, /менеджмент/i, /администр/i], weight: 1.0 },
  { nodeId: "management.public", patterns: [/государственн.*управлен/i, /public administration/i], weight: 2.0 },
  { nodeId: "management.project", patterns: [/проектн.*управлен/i], weight: 2.0 },
  { nodeId: "management.hr", patterns: [/персонал/i, /кадры/i, /hr/i], weight: 2.0 },
  { nodeId: "management.operations", patterns: [/операцион/i, /процесс/i], weight: 1.9 },
]

export interface TaxonomyGraph {
  taxonomyById: Map<string, TaxonomyNode>
  rootNodeIds: string[]
  aliasToNodeIds: Map<string, string[]>
  descendantsById: Map<string, string[]>
  ancestorsById: Map<string, string[]>
}

export interface NodeClassification {
  nodeIds: string[]
  primaryNodeId: string
  rootNodeIds: string[]
  taxonomyLabels: string[]
  taxonomyPath: string[]
  branchKey: string
  matchedNodeIds: string[]
}

export function buildTaxonomyGraph(): TaxonomyGraph {
  const nodes = new Map<string, TaxonomyNode>()

  for (const spec of [...ROOT_SPECS, ...CHILD_SPECS]) {
    nodes.set(spec.id, {
      ...spec,
      parentId: spec.parentId ?? null,
      aliases: spec.aliases ?? [],
      keywords: spec.keywords ?? [],
      clusterIds: spec.clusterIds ?? [],
      origin: spec.origin ?? "system",
      active: spec.active ?? true,
      childrenIds: [],
      depth: 0,
      path: [],
    })
  }

  for (const node of nodes.values()) {
    if (!node.parentId) continue
    const parent = nodes.get(node.parentId)
    if (parent) parent.childrenIds.push(node.id)
  }

  const rootNodeIds = [...nodes.values()]
    .filter((node) => node.parentId === null)
    .map((node) => node.id)

  const descendantsById = new Map<string, string[]>()
  const ancestorsById = new Map<string, string[]>()

  const visit = (nodeId: string, lineageIds: string[]): void => {
    const node = nodes.get(nodeId)
    if (!node) return

    node.depth = lineageIds.length
    node.path = [
      ...lineageIds.map((ancestorId) => nodes.get(ancestorId)?.label ?? ancestorId),
      node.label,
    ]
    ancestorsById.set(nodeId, lineageIds)

    const descendants: string[] = []
    for (const childId of node.childrenIds) {
      descendants.push(childId)
      visit(childId, [...lineageIds, node.id])
      const childDescendants = descendantsById.get(childId) ?? []
      descendants.push(...childDescendants)
    }
    descendantsById.set(nodeId, uniqueTokens(descendants))
  }

  for (const rootId of rootNodeIds) {
    visit(rootId, [])
  }

  const aliasToNodeIds = new Map<string, string[]>()
  for (const node of nodes.values()) {
    const aliases = uniqueTokens([
      node.label,
      ...(node.aliases ?? []),
      ...(node.keywords ?? []),
      ...(node.path ?? []),
    ].flatMap((value) => tokenize(value)))

    for (const alias of aliases) {
      const existing = aliasToNodeIds.get(alias) ?? []
      if (!existing.includes(node.id)) {
        aliasToNodeIds.set(alias, [...existing, node.id])
      }
    }
  }

  return { taxonomyById: nodes, rootNodeIds, aliasToNodeIds, descendantsById, ancestorsById }
}

export function classifyTextToNodes(
  text: string,
  graph: TaxonomyGraph,
): NodeClassification {
  const normalized = normalizeText(text)
  const scoreMap = new Map<string, number>()
  const matchedNodeIds = new Set<string>()

  for (const rule of DOCUMENT_RULES) {
    if (!graph.taxonomyById.has(rule.nodeId)) continue
    if (rule.patterns.some((pattern) => matchesPattern(normalized, pattern))) {
      scoreMap.set(rule.nodeId, (scoreMap.get(rule.nodeId) ?? 0) + rule.weight)
      matchedNodeIds.add(rule.nodeId)
    }
  }

  if (scoreMap.size === 0) {
    scoreMap.set("other", 0.25)
  }

  const ranked = [...scoreMap.entries()].sort((a, b) => b[1] - a[1])
  const primaryNodeId = graph.taxonomyById.has(ranked[0]?.[0] ?? "")
    ? ranked[0][0]
    : "other"
  const selected = new Set<string>()

  for (const [nodeId] of ranked.slice(0, 4)) {
    collectNodeLineage(nodeId, graph, selected)
  }

  const nodeIds = [...selected].filter((nodeId) => graph.taxonomyById.has(nodeId))
  const taxonomyLabels = collectLabels(nodeIds, graph)
  const taxonomyPath = graph.taxonomyById.get(primaryNodeId)?.path ?? []
  const rootNodeIds = uniqueTokens(
    nodeIds
      .map((nodeId) => getRootNodeId(nodeId, graph))
      .filter((value): value is string => Boolean(value)),
  )
  const branchRoot = rootNodeIds[0] ?? getRootNodeId(primaryNodeId, graph) ?? "other"
  const branchKey = `${branchRoot}::${primaryNodeId}`

  return {
    nodeIds,
    primaryNodeId,
    rootNodeIds,
    taxonomyLabels,
    taxonomyPath,
    branchKey,
    matchedNodeIds: [...matchedNodeIds],
  }
}

export function resolveNodeSeeds(
  query: Pick<SearchQuery, "tokens" | "phrases" | "normalized">,
  graph: TaxonomyGraph,
): Map<string, number> {
  const scores = new Map<string, number>()
  const terms = uniqueTokens([...query.tokens, ...query.phrases, ...buildTokenNGrams(query.tokens)])
  const normalized = query.normalized

  for (const term of terms) {
    const direct = graph.aliasToNodeIds.get(term)
    if (direct) {
      for (const nodeId of direct) {
        scores.set(nodeId, (scores.get(nodeId) ?? 0) + term.split(" ").length * 1.15)
      }
    }

    for (const [alias, nodeIds] of graph.aliasToNodeIds) {
      if (alias === term) continue
      if (alias.includes(term) || term.includes(alias) || normalized.includes(alias)) {
        const bonus = alias === term ? 1 : alias.split(" ").length > 1 ? 0.95 : 0.65
        for (const nodeId of nodeIds) {
          scores.set(nodeId, (scores.get(nodeId) ?? 0) + bonus)
        }
      }
    }
  }

  return scores
}

export function expandNodeSeeds(
  seeds: Map<string, number>,
  graph: TaxonomyGraph,
  intent: SearchIntent,
): string[] {
  const expanded = new Set<string>()
  const rankedSeeds = [...seeds.entries()].sort((a, b) => b[1] - a[1])

  for (const [nodeId] of rankedSeeds.slice(0, 8)) {
    collectNodeLineage(nodeId, graph, expanded)
    expanded.add(nodeId)

    if (intent === "broad" || graph.taxonomyById.get(nodeId)?.depth === 0) {
      for (const descendantId of graph.descendantsById.get(nodeId) ?? []) {
        expanded.add(descendantId)
      }
    } else if (graph.taxonomyById.get(nodeId)?.depth === 1) {
      for (const descendantId of graph.descendantsById.get(nodeId) ?? []) {
        expanded.add(descendantId)
      }
    }
  }

  return [...expanded]
}

export function nodeAffinity(
  leftNodeId: string,
  rightNodeId: string,
  graph: TaxonomyGraph,
): number {
  if (!leftNodeId || !rightNodeId) return 0
  if (leftNodeId === rightNodeId) return 1

  const leftPath = graph.taxonomyById.get(leftNodeId)?.path ?? []
  const rightPath = graph.taxonomyById.get(rightNodeId)?.path ?? []
  if (leftPath.length === 0 || rightPath.length === 0) return 0

  if (isAncestor(leftNodeId, rightNodeId, graph) || isAncestor(rightNodeId, leftNodeId, graph)) {
    const distance = Math.abs(leftPath.length - rightPath.length)
    return Math.max(0.68, 0.98 - distance * 0.12)
  }

  if (leftPath[0] === rightPath[0]) {
    return leftPath.length > 1 && rightPath.length > 1 ? 0.78 : 0.88
  }

  const leftParent = graph.taxonomyById.get(leftNodeId)?.parentId
  const rightParent = graph.taxonomyById.get(rightNodeId)?.parentId
  if (leftParent && leftParent === rightParent) {
    return 0.7
  }

  return 0
}

export function matchesPattern(text: string, pattern: string | RegExp): boolean {
  if (typeof pattern === "string") {
    return normalizeText(text).includes(normalizeText(pattern))
  }

  return pattern.test(text)
}

export function getRootNodeId(nodeId: string, graph: TaxonomyGraph): string | null {
  let current = graph.taxonomyById.get(nodeId)
  while (current?.parentId) {
    current = graph.taxonomyById.get(current.parentId)
  }
  return current?.id ?? null
}

export function isAncestor(ancestorId: string, nodeId: string, graph: TaxonomyGraph): boolean {
  const ancestors = graph.ancestorsById.get(nodeId) ?? []
  return ancestors.includes(ancestorId)
}

export function collectLabels(nodeIds: string[], graph: TaxonomyGraph): string[] {
  const labels: string[] = []
  for (const nodeId of nodeIds) {
    const node = graph.taxonomyById.get(nodeId)
    if (node && !labels.includes(node.label)) {
      labels.push(node.label)
    }
  }
  return labels
}

function collectNodeLineage(nodeId: string, graph: TaxonomyGraph, sink: Set<string>): void {
  const ancestors = graph.ancestorsById.get(nodeId) ?? []
  for (const ancestorId of ancestors) {
    sink.add(ancestorId)
  }
  sink.add(nodeId)
}
