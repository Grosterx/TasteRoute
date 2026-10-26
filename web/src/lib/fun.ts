export type FunFeature = 'shawarma' | 'horoscope'

export type FunAccent = 'saffron' | 'basil' | 'tomato'

export type FunIcon =
  | 'sandwich'
  | 'flame'
  | 'heart'
  | 'leaf'
  | 'sparkles'
  | 'users'
  | 'moon'
  | 'croissant'
  | 'cookie'
  | 'cake'
  | 'wheat'
  | 'donut'
  | 'candy'

export type FunResult = {
  id: string
  feature: FunFeature
  title: string
  subtitle: string
  description: string
  traits: string[]
  pairing: string
  icon: FunIcon
  accent: FunAccent
}

export type FunFeatureMeta = {
  id: FunFeature
  path: string
  eyebrow: string
  title: string
  description: string
  action: string
  icon: FunIcon
  accent: FunAccent
}

export type QuizOption = {
  id: string
  label: string
  weights: Record<string, number>
}

export type QuizQuestion = {
  id: string
  title: string
  hint: string
  options: QuizOption[]
}

export type ZodiacSign = {
  id: string
  name: string
  dates: string
  element: string
}

export const funFeatures: FunFeatureMeta[] = [
  {
    id: 'shawarma',
    path: '/fun/shawarma',
    eyebrow: 'Тест на 30 секунд',
    title: 'Какая ты шаурма сегодня?',
    description:
      'Три вопроса про настроение, соус и компанию. В конце — твой гастро-характер и маршрут под него.',
    action: 'Узнать свою шаурму',
    icon: 'sandwich',
    accent: 'saffron',
  },
  {
    id: 'horoscope',
    path: '/fun/horoscope',
    eyebrow: 'Еда и звёзды',
    title: 'Какая ты булка по гороскопу?',
    description:
      'Выбери знак зодиака — и получи хлебный портрет: от круассана до чизкейка. Без даты рождения.',
    action: 'Погадать на булке',
    icon: 'croissant',
    accent: 'basil',
  },
]

export const zodiacSigns: ZodiacSign[] = [
  { id: 'aries', name: 'Овен', dates: '21.03–19.04', element: 'огонь' },
  { id: 'taurus', name: 'Телец', dates: '20.04–20.05', element: 'земля' },
  { id: 'gemini', name: 'Близнецы', dates: '21.05–20.06', element: 'воздух' },
  { id: 'cancer', name: 'Рак', dates: '21.06–22.07', element: 'вода' },
  { id: 'leo', name: 'Лев', dates: '23.07–22.08', element: 'огонь' },
  { id: 'virgo', name: 'Дева', dates: '23.08–22.09', element: 'земля' },
  { id: 'libra', name: 'Весы', dates: '23.09–22.10', element: 'воздух' },
  { id: 'scorpio', name: 'Скорпион', dates: '23.10–21.11', element: 'вода' },
  { id: 'sagittarius', name: 'Стрелец', dates: '22.11–21.12', element: 'огонь' },
  { id: 'capricorn', name: 'Козерог', dates: '22.12–19.01', element: 'земля' },
  { id: 'aquarius', name: 'Водолей', dates: '20.01–18.02', element: 'воздух' },
  { id: 'pisces', name: 'Рыбы', dates: '19.02–20.03', element: 'вода' },
]

export const shawarmaResults: FunResult[] = [
  {
    id: 'classic',
    feature: 'shawarma',
    title: 'Шаурма-классик',
    subtitle: 'Надёжный выбор без сюрпризов',
    description:
      'Ты — та самая шаурма, которую заказывают, когда хочется, чтобы всё было по-человечески: курица, свежие овощи, чесночный соус и лаваш, который не подведёт. В компании на тебя всегда можно положиться.',
    traits: ['баланс', 'надёжность', 'чувство меры'],
    pairing: 'Идеально с картошкой по-деревенски и холодным лимонадом.',
    icon: 'sandwich',
    accent: 'saffron',
  },
  {
    id: 'flame',
    feature: 'shawarma',
    title: 'Шаурма-огонёк',
    subtitle: 'Остро, смело, без компромиссов',
    description:
      'Ты сегодня — тот самый вариант с острым соусом и халапеньо. С тобой не бывает скучно: сначала искры, потом слёзы, потом просишь добавки. Главное — не забыть салфетки.',
    traits: ['смелость', 'драйв', 'характер'],
    pairing: 'Лучше всего с айраном или морсом — чтобы не сгореть.',
    icon: 'flame',
    accent: 'tomato',
  },
  {
    id: 'romantic',
    feature: 'shawarma',
    title: 'Шаурма-романтик',
    subtitle: 'Нежно, сырно, с заботой',
    description:
      'Ты выбираешь сырный соус, курицу и побольше мягкости. В тебе много тепла, и ты умеешь сделать даже обычный перекус уютным. Сегодня тебе особенно идёт забота о близких.',
    traits: ['тепло', 'забота', 'уют'],
    pairing: 'К томатному супу и разговору по душам.',
    icon: 'heart',
    accent: 'tomato',
  },
  {
    id: 'minimal',
    feature: 'shawarma',
    title: 'Шаурма-минималист',
    subtitle: 'Всё по делу, ничего лишнего',
    description:
      'Мясо, лаваш, немного овощей — и достаточно. Ты не любишь лишний шум и сложные сочетания. Твоя сила в ясности: ты быстро понимаешь, чего хочешь, и не тратишь время на сомнения.',
    traits: ['ясность', 'лаконичность', 'фокус'],
    pairing: 'С простой водой и короткой прогулкой.',
    icon: 'leaf',
    accent: 'basil',
  },
  {
    id: 'explorer',
    feature: 'shawarma',
    title: 'Шаурма-экспериментатор',
    subtitle: 'Необычные начинки и секретный соус',
    description:
      'Тебе скучно повторяться, поэтому сегодня ты пробуешь что-то новое: грибы, ананас, авторский соус — пусть будет. Ты заряжаешь компанию любопытством и находишь вкус там, где другие не искали.',
    traits: ['любопытство', 'смелость', 'вкус к новому'],
    pairing: 'С чем-нибудь, чего ты ещё не пробовал.',
    icon: 'sparkles',
    accent: 'saffron',
  },
  {
    id: 'soul',
    feature: 'shawarma',
    title: 'Шаурма-душа компании',
    subtitle: 'Макси-порция для всех своих',
    description:
      'Ты — большая шаурма, которую хочется разделить с друзьями. Вокруг тебя всегда кто-то смеётся, что-то обсуждает и тянется за добавкой. Сегодня твоя суперсила — собирать людей вместе.',
    traits: ['щедрость', 'коммуникабельность', 'энергия'],
    pairing: 'С большой компанией и общим столом.',
    icon: 'users',
    accent: 'basil',
  },
  {
    id: 'midnight',
    feature: 'shawarma',
    title: 'Шаурма-полуночник',
    subtitle: 'Спонтанно, после всего',
    description:
      'Ты сегодня — вариант «а давайте ещё погуляем». Решение приходит поздно, зато самое вкусное. Ты умеешь наслаждаться моментом и не портить его планами на завтра.',
    traits: ['спонтанность', 'лёгкость', 'ночной вайб'],
    pairing: 'С ночной улицей, музыкой и друзьями.',
    icon: 'moon',
    accent: 'tomato',
  },
  {
    id: 'veggie',
    feature: 'shawarma',
    title: 'Шаурма-овощная',
    subtitle: 'Свежо, зелено, легко',
    description:
      'Ты выбираешь фалафель, побольше зелени и соус, в котором есть характер. В тебе много лёгкости и осознанности: ты умеешь заботиться о себе и находить баланс без лишнего пафоса.',
    traits: ['лёгкость', 'осознанность', 'свежесть'],
    pairing: 'С зелёным салатом и травяным чаем.',
    icon: 'leaf',
    accent: 'basil',
  },
]

export const bunResults: FunResult[] = [
  {
    id: 'aries',
    feature: 'horoscope',
    title: 'Круассан',
    subtitle: 'Хрустящий снаружи, мягкий внутри',
    description:
      'Ты начинаешь день с разгона: быстро загораешься, действуешь первым и не боишься ошибиться. Главное — не забывать остыть и дать себе паузу.',
    traits: ['энергия', 'инициатива', 'скорость'],
    pairing: 'С крепким кофе и планом на день.',
    icon: 'croissant',
    accent: 'saffron',
  },
  {
    id: 'taurus',
    feature: 'horoscope',
    title: 'Синнабон',
    subtitle: 'Уют, корица и никакой спешки',
    description:
      'Ты — про тепло и удовольствие без гонки. Тебя сложно сбить с пути, если рядом есть что-то по-настоящему вкусное. Твоя сила — в стабильности и умении наслаждаться моментом.',
    traits: ['уют', 'стабильность', 'чувственность'],
    pairing: 'С какао и любимым пледом.',
    icon: 'cookie',
    accent: 'saffron',
  },
  {
    id: 'gemini',
    feature: 'horoscope',
    title: 'Эклер',
    subtitle: 'Два характера в одной оболочке',
    description:
      'В тебе будто два характера: сливочный и глазурный, серьёзный и лёгкий. Ты быстро переключаешься, легко находишь общий язык и умеешь удивить даже тех, кто думал, что тебя знает.',
    traits: ['переменчивость', 'любопытство', 'общение'],
    pairing: 'С новым разговором и неожиданной идеей.',
    icon: 'cake',
    accent: 'basil',
  },
  {
    id: 'cancer',
    feature: 'horoscope',
    title: 'Ватрушка',
    subtitle: 'Тёплая, домашняя, своя',
    description:
      'Рядом с тобой хочется выдохнуть, налить чай и рассказать всё, что накопилось. Ты чувствуешь настроение других лучше многих и умеешь создавать безопасное тепло.',
    traits: ['забота', 'тепло', 'интуиция'],
    pairing: 'С чаем и человеком, которому доверяешь.',
    icon: 'cookie',
    accent: 'tomato',
  },
  {
    id: 'leo',
    feature: 'horoscope',
    title: 'Медовик',
    subtitle: 'Король стола и всеобщий любимец',
    description:
      'Тебя замечают, тебе рады, вокруг тебя собираются люди. Ты умеешь быть в центре внимания и делиться теплом так, чтобы всем хватило. Главное — не забывать слушать других.',
    traits: ['харизма', 'щедрость', 'уверенность'],
    pairing: 'С компанией и поводом сказать тост.',
    icon: 'cake',
    accent: 'saffron',
  },
  {
    id: 'virgo',
    feature: 'horoscope',
    title: 'Багет',
    subtitle: 'Снаружи простой, внутри идеальный',
    description:
      'Ты ценишь порядок, детали и честный вкус без лишних украшений. Твоя суперсила — делать обычные вещи лучше, чем все остальные, и замечать то, что пропустили другие.',
    traits: ['точность', 'практичность', 'внимание'],
    pairing: 'С сыром, оливками и хорошей книгой.',
    icon: 'wheat',
    accent: 'basil',
  },
  {
    id: 'libra',
    feature: 'horoscope',
    title: 'Макарон',
    subtitle: 'Эстетика, баланс и лёгкость',
    description:
      'Тебе важно, чтобы вокруг было красиво и гармонично, а компания — приятной. Ты умеешь сглаживать углы, находить компромиссы и превращать обычный вечер в красивую историю.',
    traits: ['гармония', 'эстетика', 'дипломатия'],
    pairing: 'С красивым десертом и приятной музыкой.',
    icon: 'candy',
    accent: 'tomato',
  },
  {
    id: 'scorpio',
    feature: 'horoscope',
    title: 'Брауни',
    subtitle: 'Насыщенный, тёмный, с секретом',
    description:
      'Снаружи ты спокойный, внутри — целая вселенная. Ты не открываешься сразу, зато тем, кто рядом, достаётся самое интересное. Твоя сила — в глубине и умении чувствовать правду.',
    traits: ['глубина', 'страсть', 'загадка'],
    pairing: 'С чёрным кофе и честным разговором.',
    icon: 'cookie',
    accent: 'tomato',
  },
  {
    id: 'sagittarius',
    feature: 'horoscope',
    title: 'Пончик',
    subtitle: 'Лёгкий, солнечный, всегда в пути',
    description:
      'Тебе хочется попробовать всё, побывать везде и нигде не задерживаться слишком долго. С тобой легко и весело, а любая дорога превращается в маленькое приключение.',
    traits: ['свобода', 'оптимизм', 'лёгкость'],
    pairing: 'С дорогой, музыкой и спонтанной остановкой.',
    icon: 'donut',
    accent: 'saffron',
  },
  {
    id: 'capricorn',
    feature: 'horoscope',
    title: 'Пряник',
    subtitle: 'Основательный, как бабушкин рецепт',
    description:
      'Ты не любишь суету, зато умеешь доводить начатое до конца. Твоя сила — в терпении и верности традициям. Рядом с тобой всё становится чуть более надёжным.',
    traits: ['надёжность', 'терпение', 'традиции'],
    pairing: 'С чаем и разговором о планах на год.',
    icon: 'cookie',
    accent: 'saffron',
  },
  {
    id: 'aquarius',
    feature: 'horoscope',
    title: 'Бриошь',
    subtitle: 'Воздушная, но с изюминкой',
    description:
      'Ты не похож на остальных и не пытаешься им быть. У тебя неожиданные идеи, странные сочетания и свой собственный вкус. Именно это делает тебя по-настоящему интересным.',
    traits: ['независимость', 'оригинальность', 'идеи'],
    pairing: 'С необычным джемом и разговором о будущем.',
    icon: 'croissant',
    accent: 'basil',
  },
  {
    id: 'pisces',
    feature: 'horoscope',
    title: 'Чизкейк',
    subtitle: 'Нежный, сливочный, немного мечтательный',
    description:
      'У тебя богатое воображение и мягкое сердце. Ты умеешь создавать атмосферу, в которой хочется остаться подольше, и находить красоту в самых простых вещах.',
    traits: ['мечтательность', 'нежность', 'творчество'],
    pairing: 'С ягодами, тишиной и хорошим фильмом.',
    icon: 'cake',
    accent: 'basil',
  },
]

export const shawarmaQuestions: QuizQuestion[] = [
  {
    id: 'mood',
    title: 'Как проходит твой день?',
    hint: 'Вопрос 1',
    options: [
      {
        id: 'calm',
        label: 'Спокойно и размеренно',
        weights: { classic: 2, romantic: 1, veggie: 1, minimal: 1 },
      },
      {
        id: 'sprint',
        label: 'На скорости, но всё под контролем',
        weights: { soul: 2, classic: 1, flame: 1 },
      },
      {
        id: 'fire',
        label: 'Горит всё, но мне даже нравится',
        weights: { flame: 3, midnight: 1 },
      },
      {
        id: 'adventure',
        label: 'Хочу приключений и нового',
        weights: { explorer: 3, veggie: 1, midnight: 1 },
      },
    ],
  },
  {
    id: 'sauce',
    title: 'Выбери соус',
    hint: 'Вопрос 2',
    options: [
      {
        id: 'garlic',
        label: 'Чесночный, побольше',
        weights: { classic: 2, soul: 1, midnight: 1 },
      },
      {
        id: 'hot',
        label: 'Острый, без компромиссов',
        weights: { flame: 3, explorer: 1 },
      },
      {
        id: 'cheese',
        label: 'Сырный и нежный',
        weights: { romantic: 3, classic: 1 },
      },
      {
        id: 'green',
        label: 'Зелени побольше',
        weights: { veggie: 3, minimal: 2 },
      },
    ],
  },
  {
    id: 'company',
    title: 'С кем ты сегодня?',
    hint: 'Вопрос 3',
    options: [
      {
        id: 'alone',
        label: 'Наедине с собой',
        weights: { minimal: 3, veggie: 1, classic: 1 },
      },
      {
        id: 'friend',
        label: 'С лучшим другом',
        weights: { romantic: 2, classic: 1, explorer: 1 },
      },
      {
        id: 'party',
        label: 'Большой компанией',
        weights: { soul: 3, flame: 1 },
      },
      {
        id: 'night',
        label: 'После вечеринки',
        weights: { midnight: 3, soul: 1, explorer: 1 },
      },
    ],
  },
]

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

export function resolveShawarma(answers: Record<string, string>) {
  const scores = new Map<string, number>()

  for (const question of shawarmaQuestions) {
    const option = question.options.find((item) => item.id === answers[question.id])
    if (!option) continue
    for (const [resultId, weight] of Object.entries(option.weights)) {
      scores.set(resultId, (scores.get(resultId) ?? 0) + weight)
    }
  }

  if (scores.size === 0) return shawarmaResults[0]

  const maxScore = Math.max(...Array.from(scores.values()))
  const leaders = shawarmaResults.filter((result) => (scores.get(result.id) ?? 0) === maxScore)
  if (leaders.length === 1) return leaders[0]

  const seed = `${new Date().toISOString().slice(0, 10)}:${Object.values(answers).join(':')}`
  return leaders[hashString(seed) % leaders.length]
}

export function findShawarmaResult(id: string | null) {
  return shawarmaResults.find((result) => result.id === id) ?? null
}

export function findBunResult(id: string | null) {
  return bunResults.find((result) => result.id === id) ?? null
}

export function findFunResult(feature: string | null, id: string | null) {
  if (feature === 'shawarma') return findShawarmaResult(id)
  if (feature === 'horoscope') return findBunResult(id)
  return null
}

export function funCreatePath(result: FunResult) {
  return `/create?fun=${encodeURIComponent(result.feature)}&result=${encodeURIComponent(result.id)}`
}

export function funSharePath(result: FunResult) {
  return `/fun/${result.feature}?result=${encodeURIComponent(result.id)}`
}

export function funShareText(result: FunResult, origin: string) {
  return `Я сегодня — ${result.title}: ${result.subtitle}. А ты? ${origin}${funSharePath(result)}`
}
