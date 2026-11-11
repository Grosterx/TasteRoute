export type FunFeature = 'shawarma' | 'horoscope' | 'tarot' | 'pair'

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
  | 'wine'
  | 'fish'
  | 'beef'
  | 'pizza'
  | 'salad'
  | 'soup'
  | 'coffee'
  | 'icecream'
  | 'drumstick'
  | 'citrus'

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
  {
    id: 'tarot',
    path: '/fun#tarot',
    eyebrow: 'Гадание на аппетит',
    title: 'Расклад на вечер',
    description:
      'Перетасуй гастро-колоду и вытяни три карты: аперитив, основное и десерт. Расклад меняется каждый день.',
    action: 'Вытянуть три карты',
    icon: 'moon',
    accent: 'tomato',
  },
  {
    id: 'pair',
    path: '/fun#pair',
    eyebrow: 'Тест на двоих',
    title: 'Гастро-совместимость пары',
    description:
      'Пять вопросов — и процент совпадения вкусов. Передайте телефон друг другу и узнайте, совместимы ли вы за одним столом.',
    action: 'Проверить совместимость',
    icon: 'heart',
    accent: 'tomato',
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

export type TarotPosition = 'aperitif' | 'main' | 'dessert'

export type TarotCard = FunResult & { position: TarotPosition }

export type TarotPositionMeta = {
  id: TarotPosition
  label: string
  hint: string
}

export const tarotPositions: TarotPositionMeta[] = [
  { id: 'aperitif', label: 'Аперитив', hint: 'Чем открыть вечер' },
  { id: 'main', label: 'Основное', hint: 'Что станет главным' },
  { id: 'dessert', label: 'Десерт', hint: 'Чем закончить' },
]

export const tarotAperitifCards: TarotCard[] = [
  {
    id: 'ap-crunch',
    feature: 'tarot',
    position: 'aperitif',
    title: 'Карта Хруста',
    subtitle: 'Лёгкие закуски к старту',
    description:
      'Вечер начнётся звонко: брускетты, чипсы из лаваша и что-то похрустеть под первый тост. Аппетит проснётся раньше, чем вы успеете договорить тост.',
    traits: ['лёгкость', 'разгон'],
    pairing: 'С лимонадом и первой шуткой вечера.',
    icon: 'wheat',
    accent: 'saffron',
  },
  {
    id: 'ap-fizz',
    feature: 'tarot',
    position: 'aperitif',
    title: 'Бокал Пузырьков',
    subtitle: 'Игристое настроение',
    description:
      'Вечер стартует с шипения: просекко, сидр или просто газировка со льдом. Пузырьки поднимут настроение, а тост поднимет бокалы.',
    traits: ['праздничность', 'искристость'],
    pairing: 'С оливками и хорошей компанией.',
    icon: 'wine',
    accent: 'basil',
  },
  {
    id: 'ap-olive',
    feature: 'tarot',
    position: 'aperitif',
    title: 'Оливковая Луна',
    subtitle: 'Оливки и тапас',
    description:
      'Медленное начало: оливки, хамон, маленькие тарелки на всех. Вечер никуда не спешит — и это его лучшая черта.',
    traits: ['неспешность', 'изящество'],
    pairing: 'С вермутом или тихим разговором.',
    icon: 'moon',
    accent: 'basil',
  },
  {
    id: 'ap-tide',
    feature: 'tarot',
    position: 'aperitif',
    title: 'Креветочный Прилив',
    subtitle: 'Морской старт',
    description:
      'К вечеру тянет к морю: креветки, мидии, кальмар на гриле. Аппетит приходит волнами — и первая уже близко.',
    traits: ['смелость', 'морской вайб'],
    pairing: 'С белым вином или лимонадом.',
    icon: 'fish',
    accent: 'saffron',
  },
  {
    id: 'ap-cheese',
    feature: 'tarot',
    position: 'aperitif',
    title: 'Сырная Комета',
    subtitle: 'Сырная тарелка',
    description:
      'Яркий пролёт над столом: бри, дор блю, чеддер и немного мёда. Комета сыра не оставит равнодушных — проверено звёздами.',
    traits: ['насыщенность', 'яркость'],
    pairing: 'С грушей, мёдом и бокалом красного.',
    icon: 'sparkles',
    accent: 'saffron',
  },
  {
    id: 'ap-sun',
    feature: 'tarot',
    position: 'aperitif',
    title: 'Капрезе Солнце',
    subtitle: 'Свежий салат',
    description:
      'Ясное начало: томаты, моцарелла, базилик. Вечер обещает быть свежим, лёгким и без тяжести — как летний полдень.',
    traits: ['свежесть', 'простота'],
    pairing: 'С холодным напитком и улыбкой.',
    icon: 'citrus',
    accent: 'basil',
  },
  {
    id: 'ap-bowl',
    feature: 'tarot',
    position: 'aperitif',
    title: 'Дымящаяся Чаша',
    subtitle: 'Тёплый старт',
    description:
      'Вечер откроется теплом: бульон, крем-суп или гаспачо, если жарко. Первая ложка — и разговоры пойдут сами собой.',
    traits: ['тепло', 'забота'],
    pairing: 'С хлебом и неторопливой беседой.',
    icon: 'soup',
    accent: 'tomato',
  },
  {
    id: 'ap-bread',
    feature: 'tarot',
    position: 'aperitif',
    title: 'Тёплый Лаваш',
    subtitle: 'Хлеб и намазки',
    description:
      'Старт по-домашнему: тёплый хлеб, хумус, паштет. Все тянутся к столу руками — значит, вечер уже удался.',
    traits: ['уют', 'щедрость'],
    pairing: 'С мягким светом и близкими.',
    icon: 'wheat',
    accent: 'saffron',
  },
]

export const tarotMainCards: TarotCard[] = [
  {
    id: 'mn-emperor',
    feature: 'tarot',
    position: 'main',
    title: 'Сытный Император',
    subtitle: 'Мясо на гриле, всерьёз',
    description:
      'Главное блюдо вечера — вес и характер: стейк, картошка, соус. Император не признаёт полумер, зато голодным никто не останется.',
    traits: ['основательность', 'характер'],
    pairing: 'С красным вином и большим аппетитом.',
    icon: 'beef',
    accent: 'tomato',
  },
  {
    id: 'mn-devil',
    feature: 'tarot',
    position: 'main',
    title: 'Дьявольский Перец',
    subtitle: 'Острое основное',
    description:
      'Вечер обещает искры: перец чили, халапеньо, огонь в соусе. Сначала страсть, потом слёзы, потом добавка. Дьявол знает, что делает.',
    traits: ['острота', 'смелость'],
    pairing: 'С айраном — чтобы потушить.',
    icon: 'flame',
    accent: 'tomato',
  },
  {
    id: 'mn-fortune',
    feature: 'tarot',
    position: 'main',
    title: 'Пицца Фортуны',
    subtitle: 'Круглое счастье на всех',
    description:
      'Судьба раскатала вечер в идеальный круг: пицца, сырные борта, топпинги на любой вкус. От колеса не убежать — да и зачем.',
    traits: ['щедрость', 'делёж'],
    pairing: 'С компанией от трёх человек.',
    icon: 'pizza',
    accent: 'saffron',
  },
  {
    id: 'mn-ramen',
    feature: 'tarot',
    position: 'main',
    title: 'Рамен Дождей',
    subtitle: 'Азиатская чаша',
    description:
      'Вечер с характером умами: бульон, лапша, яйцо вкрутую и зелёный лук. Дождь за окном не помеха — особенно если он в рамене.',
    traits: ['глубина', 'умами'],
    pairing: 'С палочками и неспешностью.',
    icon: 'soup',
    accent: 'saffron',
  },
  {
    id: 'mn-king',
    feature: 'tarot',
    position: 'main',
    title: 'Рыбный Король',
    subtitle: 'Рыба на гриле',
    description:
      'Главное блюдо сегодня из воды: лосось, дорадо или сибас. Король сидит на троне из лимона и требует к себе уважения.',
    traits: ['нежность', 'статус'],
    pairing: 'С белым вином и долькой лимона.',
    icon: 'fish',
    accent: 'basil',
  },
  {
    id: 'mn-burger',
    feature: 'tarot',
    position: 'main',
    title: 'Бургер Бессмертия',
    subtitle: 'Двухэтажная классика',
    description:
      'Вечер строится по бургерным законам: котлета, сыр, соус. Нижний этаж держит верхний — как хороший друг. Один бургер — и вечер бессмертен.',
    traits: ['надёжность', 'масштаб'],
    pairing: 'С картошкой и обеими руками.',
    icon: 'sandwich',
    accent: 'saffron',
  },
  {
    id: 'mn-hermit',
    feature: 'tarot',
    position: 'main',
    title: 'Овощной Отшельник',
    subtitle: 'Растительное основное',
    description:
      'Тихая сила вечера: рататуй, овощи с гриля, фалафель. Отшельник не спорит с мясом — просто знает себе цену.',
    traits: ['осознанность', 'лёгкость'],
    pairing: 'С зелёным салатом и чистой совестью.',
    icon: 'salad',
    accent: 'basil',
  },
  {
    id: 'mn-wings',
    feature: 'tarot',
    position: 'main',
    title: 'Крылья Судьбы',
    subtitle: 'Курица и азарт',
    description:
      'Вечер решается на косточке: крылья, соусы, азарт. Одна партия — и вы заказываете вторую. Судьба любит смелых.',
    traits: ['азарт', 'веселье'],
    pairing: 'С соусом блю-чиз и друзьями.',
    icon: 'drumstick',
    accent: 'tomato',
  },
]

export const tarotDessertCards: TarotCard[] = [
  {
    id: 'ds-abyss',
    feature: 'tarot',
    position: 'dessert',
    title: 'Шоколадная Бездна',
    subtitle: 'Тёплый шоколад',
    description:
      'Вечер закончится глубоко: фондан с жидким центром. Бездна смотрит на вас — загляните и вы в неё.',
    traits: ['глубина', 'сладость'],
    pairing: 'С шариком мороженого.',
    icon: 'candy',
    accent: 'tomato',
  },
  {
    id: 'ds-tart',
    feature: 'tarot',
    position: 'dessert',
    title: 'Тарт Тузов',
    subtitle: 'Выпечка по расчёту',
    description:
      'Финальная карта стола: рассыпчатый тарт с карамелью и щепоткой соли. Туз на столе — значит, вечер удался.',
    traits: ['точность', 'сладость'],
    pairing: 'С чаем и выдержкой.',
    icon: 'croissant',
    accent: 'saffron',
  },
  {
    id: 'ds-moon',
    feature: 'tarot',
    position: 'dessert',
    title: 'Мороженое Луны',
    subtitle: 'Холодный финал',
    description:
      'Вечер остынет правильно: шарики мороженого, ягоды, мята. Луна говорит — если таять, то красиво.',
    traits: ['лёгкость', 'нежность'],
    pairing: 'С топпингом и звёздной ночью.',
    icon: 'icecream',
    accent: 'basil',
  },
  {
    id: 'ds-truth',
    feature: 'tarot',
    position: 'dessert',
    title: 'Чизкейк Истины',
    subtitle: 'Печёная нежность',
    description:
      'Финал без обмана: чизкейк, который держит форму и обещание. Истина в том, что вы закажете ещё кусочек.',
    traits: ['честность', 'нежность'],
    pairing: 'С кофе без сахара.',
    icon: 'cake',
    accent: 'basil',
  },
  {
    id: 'ds-eclair',
    feature: 'tarot',
    position: 'dessert',
    title: 'Эклер Ветров',
    subtitle: 'Лёгкий финал',
    description:
      'Вечер унесёт ветром сладости: эклер, крем, глазурь. Лёгкий, как последний разговор перед тем, как разойтись.',
    traits: ['лёгкость', 'воздух'],
    pairing: 'С какао и короткой прогулкой.',
    icon: 'croissant',
    accent: 'saffron',
  },
  {
    id: 'ds-mist',
    feature: 'tarot',
    position: 'dessert',
    title: 'Тирамису Туманов',
    subtitle: 'Кофейная дымка',
    description:
      'Финал в дымке: маскарпоне, кофе, какао. «Подними меня» — говорит десерт, и вечер послушно поднимает.',
    traits: ['загадка', 'уют'],
    pairing: 'С эспрессо и неспешностью.',
    icon: 'coffee',
    accent: 'tomato',
  },
  {
    id: 'ds-dawn',
    feature: 'tarot',
    position: 'dessert',
    title: 'Фруктовый Рассвет',
    subtitle: 'Свежий финал',
    description:
      'Вечер закончится светло: фрукты, сорбет, немного цитруса. Рассвет намекает — завтра тоже будет вкусно.',
    traits: ['свежесть', 'лёгкость'],
    pairing: 'С цитрусовым чаем.',
    icon: 'citrus',
    accent: 'basil',
  },
  {
    id: 'ds-donut',
    feature: 'tarot',
    position: 'dessert',
    title: 'Пончик Удачи',
    subtitle: 'Кольцо на счастье',
    description:
      'Финал с дыркой и смыслом: пончик с глазурью. Кольцо удачи замыкает вечер — что начало, то и конец.',
    traits: ['удача', 'веселье'],
    pairing: 'С молоком и детским восторгом.',
    icon: 'donut',
    accent: 'saffron',
  },
]

export const tarotCards: TarotCard[] = [
  ...tarotAperitifCards,
  ...tarotMainCards,
  ...tarotDessertCards,
]

const tarotPools: Record<TarotPosition, TarotCard[]> = {
  aperitif: tarotAperitifCards,
  main: tarotMainCards,
  dessert: tarotDessertCards,
}

function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

export function tarotDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function drawTarotSpread(shuffle: number, dateKey: string): TarotCard[] {
  const random = seededRandom(hashString(`${dateKey}:${shuffle}`))
  return tarotPositions.map((position) => {
    const pool = tarotPools[position.id]
    return pool[Math.floor(random() * pool.length)]
  })
}

export function encodeTarotSpread(cards: TarotCard[]) {
  return cards.map((card) => card.id).join('.')
}

export function findTarotSpread(value: string | null): TarotCard[] | null {
  if (!value) return null
  const ids = value.split('.')
  if (ids.length !== tarotPositions.length) return null
  const order: TarotPosition[] = ['aperitif', 'main', 'dessert']
  const cards: TarotCard[] = []
  for (let index = 0; index < order.length; index += 1) {
    const card = tarotCards.find((item) => item.id === ids[index] && item.position === order[index])
    if (!card) return null
    cards.push(card)
  }
  return cards
}

export function findTarotCard(id: string | null) {
  if (!id) return null
  return tarotCards.find((card) => card.id === id) ?? null
}

export function tarotSharePath(cards: TarotCard[]) {
  return `/fun?spread=${encodeURIComponent(encodeTarotSpread(cards))}`
}

export function tarotShareText(cards: TarotCard[], origin: string) {
  const names = cards.map((card) => card.title).join(' → ')
  return `Мой расклад на вечер: ${names}. Вытяни свой — ${origin}/fun#tarot`
}

export type PairAxis = 'cozy' | 'adventure' | 'sweet' | 'spicy'

export type PairProfile = Record<PairAxis, number>

export type PairOption = {
  id: string
  label: string
  weights: Partial<PairProfile>
}

export type PairQuestion = {
  id: string
  title: string
  options: PairOption[]
}

export const pairAxes: { id: PairAxis; label: string }[] = [
  { id: 'cozy', label: 'уют' },
  { id: 'adventure', label: 'приключения' },
  { id: 'sweet', label: 'сладкое' },
  { id: 'spicy', label: 'острое' },
]

export const pairQuestions: PairQuestion[] = [
  {
    id: 'evening',
    title: 'Идеальный вечер вдвоём — это…',
    options: [
      { id: 'candles', label: 'Ужин при свечах', weights: { cozy: 3 } },
      { id: 'city', label: 'Шумный вечер в городе', weights: { adventure: 2, spicy: 1 } },
      { id: 'plaid', label: 'Плед, сериал и доставка', weights: { cozy: 2, sweet: 1 } },
      { id: 'new', label: 'Что-нибудь новенькое', weights: { adventure: 3 } },
    ],
  },
  {
    id: 'spice',
    title: 'Остро или мягко?',
    options: [
      { id: 'fire', label: 'Огонь, без компромиссов', weights: { spicy: 3 } },
      { id: 'mild', label: 'Слегка остренько', weights: { spicy: 1, adventure: 1, cozy: 1 } },
      { id: 'creamy', label: 'Нежно и сливочно', weights: { sweet: 2, cozy: 1 } },
      { id: 'sweet', label: 'Лучше сладкое', weights: { sweet: 3 } },
    ],
  },
  {
    id: 'friday',
    title: 'Куда пойдём в пятницу?',
    options: [
      { id: 'sushi', label: 'Суши-бар', weights: { adventure: 1, spicy: 1, cozy: 1 } },
      { id: 'pizza', label: 'Пиццерия', weights: { cozy: 1, sweet: 1, adventure: 1 } },
      { id: 'cafe', label: 'Новая кофейня', weights: { sweet: 1, cozy: 2 } },
      { id: 'street', label: 'Стритфуд-маркет', weights: { adventure: 2, spicy: 1 } },
    ],
  },
  {
    id: 'drink',
    title: 'Твой напиток?',
    options: [
      { id: 'cocoa', label: 'Горячий шоколад', weights: { sweet: 2, cozy: 1 } },
      { id: 'espresso', label: 'Двойной эспрессо', weights: { spicy: 1, adventure: 2 } },
      { id: 'tea', label: 'Травяной чай', weights: { cozy: 2, sweet: 1 } },
      { id: 'cocktail', label: 'Коктейль поострее', weights: { spicy: 2, adventure: 1 } },
    ],
  },
  {
    id: 'breakfast',
    title: 'Завтрак мечты?',
    options: [
      { id: 'syrniki', label: 'Сырники со сметаной', weights: { sweet: 2, cozy: 1 } },
      { id: 'chili', label: 'Яичница с перцем чили', weights: { spicy: 2, adventure: 1 } },
      { id: 'croissant', label: 'Круассан с джемом', weights: { sweet: 1, cozy: 1, adventure: 1 } },
      { id: 'bowl', label: 'Смузи-боул', weights: { sweet: 1, adventure: 2 } },
    ],
  },
]

export function pairProfile(answers: Record<string, string>): PairProfile {
  const profile: PairProfile = { cozy: 0, adventure: 0, sweet: 0, spicy: 0 }
  for (const question of pairQuestions) {
    const option = question.options.find((item) => item.id === answers[question.id])
    if (!option) continue
    for (const [axis, weight] of Object.entries(option.weights)) {
      profile[axis as PairAxis] += weight ?? 0
    }
  }
  return profile
}

const PAIR_MAX_DIFF = pairQuestions.length * 6

export function pairCompatibility(first: PairProfile, second: PairProfile) {
  const diff = pairAxes.reduce(
    (total, axis) => total + Math.abs(first[axis.id] - second[axis.id]),
    0,
  )
  const percent = Math.round(100 - (diff / PAIR_MAX_DIFF) * 100)
  return Math.max(5, Math.min(100, percent))
}

export function pairSharedAxis(first: PairProfile, second: PairProfile): PairAxis {
  let best: PairAxis = 'cozy'
  let bestScore = -1
  for (const axis of pairAxes) {
    const score = Math.min(first[axis.id], second[axis.id])
    if (score > bestScore) {
      bestScore = score
      best = axis.id
    }
  }
  return best
}

export function pairVerdict(percent: number) {
  if (percent >= 85) {
    return {
      title: 'Кулинарные близнецы',
      subtitle: 'Вы читаете друг друга как меню любимого кафе',
      description:
        'Ваши вкусы почти совпадают: вы одинаково выбираете и соус, и место, и время ужина. Опасность одна — вы будете спорить не о том, что заказать, а о том, кто последний кусочек отдаст.',
    }
  }
  if (percent >= 65) {
    return {
      title: 'Вкусный тандем',
      subtitle: 'Совпадает главное — остальное можно попробовать',
      description:
        'Вы согласны в больших вещах и играючи расходитесь в мелочах. Это лучший расклад для гастротура: один заказывает проверенное, второй тянет на эксперимент — и вы попробуете вдвое больше.',
    }
  }
  if (percent >= 40) {
    return {
      title: 'Противоположные вкусы',
      subtitle: 'Вы выбираете разное — и это плюс',
      description:
        'Там, где вы расходитесь, прячется главное удовольствие: делиться. Закажите оба варианта и меняйтесь тарелками — так вечер длиннее, а стол интереснее.',
    }
  }
  return {
    title: 'Разные гастро-вселенные',
    subtitle: 'Вы бы выбрали разные рестораны — и это решаемо',
    description:
      'Ваши вкусы почти не пересекаются, зато компромисс найдётся всегда: свайпайте блюда в одной комнате, и совпавшие блюда станут вашим нейтральным полем. Или устройте гастротур на двоих.',
  }
}

export function encodePairAnswers(first: Record<string, string>, second: Record<string, string>) {
  const ids = (answers: Record<string, string>) =>
    pairQuestions.map((question) => answers[question.id] ?? '').join('.')
  return `${ids(first)}|${ids(second)}`
}

export function findPairAnswers(value: string | null) {
  if (!value) return null
  const [firstPart, secondPart] = value.split('|')
  if (!firstPart || !secondPart) return null

  const decode = (part: string) => {
    const ids = part.split('.')
    if (ids.length !== pairQuestions.length) return null
    const answers: Record<string, string> = {}
    for (let index = 0; index < pairQuestions.length; index += 1) {
      const question = pairQuestions[index]
      const option = question.options.find((item) => item.id === ids[index])
      if (!option) return null
      answers[question.id] = option.id
    }
    return answers
  }

  const first = decode(firstPart)
  const second = decode(secondPart)
  if (!first || !second) return null
  return { first, second }
}

export function pairSharePath(first: Record<string, string>, second: Record<string, string>) {
  return `/fun?pair=${encodeURIComponent(encodePairAnswers(first, second))}`
}

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

export function hashString(value: string) {
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
  if (feature === 'tarot') return findTarotCard(id)
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
