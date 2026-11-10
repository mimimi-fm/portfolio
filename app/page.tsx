'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Heart, Menu, Bookmark, Search, X } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Mode = 'ingredients' | 'mood' | 'budget'

type Recipe = {
  id: number
  name: string
  description: string
  meta: string
  image: string
  ingredients: string[]
  steps: string[]
  source?: 'ai' | 'original'
}

const recipes: Recipe[] = [
  {
    id: 1,
    name: 'ごろごろ野菜のトマト煮込み',
    description: '野菜の甘みをぎゅっと閉じ込めた、ほっとする一皿。',
    meta: '調理時間 30分　|　約 ¥650',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
    ingredients: ['玉ねぎ 1/2個', 'にんじん 1/2本', 'じゃがいも 2個', 'カットトマト缶 1缶', 'オリーブオイル 大さじ1'],
    steps: ['野菜を食べやすい大きさに切る。', '鍋にオイルを熱し、野菜を炒める。', 'トマト缶と水を加え、弱火で20分煮込む。'],
  },
  {
    id: 2,
    name: '鮭ときのこのバター醤油',
    description: '香ばしいバター醤油が食欲をそそる、フライパンひとつの簡単レシピ。',
    meta: '調理時間 20分　|　約 ¥780',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=85',
    ingredients: ['生鮭 2切れ', 'しめじ 1/2パック', 'バター 10g', '醤油 大さじ1', 'レモン お好みで'],
    steps: ['鮭に塩こしょうをする。', 'フライパンで鮭ときのこを焼く。', 'バターと醤油を加えて全体に絡める。'],
  },
  {
    id: 3,
    name: 'たっぷり野菜のキーマカレー',
    description: '忙しい日にもぴったり。スパイス香る、野菜たっぷりのキーマカレー。',
    meta: '調理時間 25分　|　約 ¥560',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85',
    ingredients: ['豚ひき肉 200g', '玉ねぎ 1個', 'パプリカ 1/2個', 'カレールウ 2皿分', 'ごはん 2膳'],
    steps: ['野菜をみじん切りにする。', 'ひき肉と野菜を炒める。', '水とルウを加えて10分煮込む。'],
  },
]

const modes: {
  key: Mode
  label: string
  placeholder: string
  hint: string
}[] = [
  {
    key: 'ingredients',
    label: '食材から探す',
    placeholder: '例：鶏むね肉、玉ねぎ、卵',
    hint: '冷蔵庫にある食材を入力してください',
  },
  {
    key: 'mood',
    label: '気分から探す',
    placeholder: '例：疲れた日に、さっぱりしたもの',
    hint: '今日の気分や食べたい料理を教えてください',
  },
  {
    key: 'budget',
    label: '予算から探す',
    placeholder: '例：500円以内で',
    hint: '1食あたりの予算を入力してください',
  },
]

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[、,，。\s]/g, '')
}

function scoreRecipe(recipe: Recipe, query: string, mode: Mode) {
  if (mode === 'budget') return 0

  const normalizedQuery = normalizeSearchText(query)
  const searchableText = normalizeSearchText(
    `${recipe.name}${recipe.description}${recipe.ingredients.join(' ')}${recipe.steps.join(' ')}`,
  )
  const terms = query
    .split(/[、,，。\s]+/)
    .map((term) => normalizeSearchText(term))
    .filter(Boolean)

  if (terms.length === 0) return 0

  const matchedTerms = terms.filter((term) => searchableText.includes(term)).length
  const exactMatch = searchableText.includes(normalizedQuery) ? 2 : 0
  const moodBoost = mode === 'mood' && matchedTerms > 0 ? 1 : 0

  return matchedTerms * 3 + exactMatch + moodBoost
}

function parseSavedIngredients(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((ingredient) => {
      if (typeof ingredient === 'string') return ingredient
      if (ingredient && typeof ingredient === 'object' && 'name' in ingredient) {
        const item = ingredient as { name?: unknown; quantity?: unknown }
        return [item.name, item.quantity].filter(Boolean).join(' ')
      }
      return ''
    })
    .filter(Boolean)
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('ingredients')
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<number[]>([])
  const [selected, setSelected] = useState<Recipe | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searched, setSearched] = useState(false)
  const router = useRouter()
  const [isSavingRecipe, setIsSavingRecipe] = useState(false)
  const [savedRecipeIds, setSavedRecipeIds] = useState<number[]>([])
  const [saveMessage, setSaveMessage] = useState('')
  const [generatedRecipes, setGeneratedRecipes] = useState<Recipe[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [searchError, setSearchError] = useState('')

  const activeMode = useMemo(
    () => modes.find((item) => item.key === mode)!,
    [mode],
  )

  const displayedRecipes =
    searched && generatedRecipes.length > 0 ? generatedRecipes : recipes

  const handleSearch = async () => {
    const trimmedQuery = query.trim()

    if (!trimmedQuery || isGenerating) {
      if (!trimmedQuery) {
        setSearchError('検索条件を入力してください。')
      }
      return
    }

    setIsGenerating(true)
    setSearchError('')

    try {
      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, query: trimmedQuery }),
      })

      const responseText = await response.text()

      console.log('[v0] API status:', response.status)
      console.log('[v0] API response:', responseText)

      let data: {
        recipes?: Array<
          Omit<Recipe, 'id' | 'image' | 'meta'> & {
            cookingTimeMinutes: number
            budgetYen: number
          }
        >
        error?: string
      } = {}
      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        throw new Error('サーバーから正しい形式の応答を受け取れませんでした。')
      }

      if (
        !response.ok ||
        !data.recipes ||
        !Array.isArray(data.recipes) ||
        data.recipes.length !== 3
      ) {
        throw new Error(data.error || 'レシピの生成に失敗しました。')
      }


      const fallbackImages = recipes.map((recipe) => recipe.image)
      const aiRecipes: Recipe[] = data.recipes.map(
        (
          recipe: Omit<Recipe, 'id' | 'meta' | 'image' | 'source'> & {
            cookingTimeMinutes: number
            budgetYen: number
          },
          index: number,
        ) => ({
          id: Date.now() + index,
          name: recipe.name,
          description: recipe.description,
          meta: `調理時間 ${recipe.cookingTimeMinutes}分　|　約 ¥${recipe.budgetYen}`,
          image: fallbackImages[index % fallbackImages.length],
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          source: 'ai',
        }),
      )

      let originalRecipes: Recipe[] = []
      if (mode !== 'budget') {
        const supabase = getSupabaseClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { data: savedRecipes } = await supabase
            .from('myrecipe')
            .select('id, recipe_name, ingredients, recipe')
            .eq('user_id', user.id)

          originalRecipes = (savedRecipes ?? []).map((savedRecipe, index) => ({
            id: -(index + 1),
            name: savedRecipe.recipe_name,
            description: 'マイページに保存したオリジナルレシピ',
            meta: 'オリジナルレシピ',
            image: fallbackImages[index % fallbackImages.length],
            ingredients: parseSavedIngredients(savedRecipe.ingredients),
            steps: String(savedRecipe.recipe ?? '')
              .split(/\n+/)
              .map((step) => step.trim())
              .filter(Boolean),
            source: 'original' as const,
          }))
        }
      }

      const rankedRecipes = [...aiRecipes, ...originalRecipes]
        .sort((first, second) => {
          const scoreDifference =
            scoreRecipe(second, trimmedQuery, mode) -
            scoreRecipe(first, trimmedQuery, mode)
          return scoreDifference
        })
        .slice(0, 3)

      setGeneratedRecipes(rankedRecipes)
      setSearched(true)
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : 'レシピの生成に失敗しました。',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleFavorite = (id: number) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
  }

  const handleSaveRecipe = async (recipe: Recipe) => {
    if (isSavingRecipe) return

    setIsSavingRecipe(true)
    setSaveMessage('')

    const supabase = getSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      setIsSavingRecipe(false)
      router.push('/login')
      return
    }

    const { data: existingRecipe, error: checkError } = await supabase
      .from('myrecipe')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_name', recipe.name)
      .maybeSingle()

    if (checkError) {
      setSaveMessage('保存状態を確認できませんでした。')
      setIsSavingRecipe(false)
      return
    }

    if (existingRecipe) {
      setSavedRecipeIds((current) =>
        current.includes(recipe.id) ? current : [...current, recipe.id],
      )
      setSaveMessage('このレシピはすでにマイレシピに保存されています。')
      setIsSavingRecipe(false)
      return
    }

    const convertedIngredients = recipe.ingredients.map((ingredient) => {
      const match = ingredient.match(/^(.+?)\s+(.+)$/)

      return {
        name: match ? match[1] : ingredient,
        quantity: match ? match[2] : '',
      }
    })

    const { error: insertError } = await supabase
      .from('myrecipe')
      .insert({
        user_id: user.id,
        recipe_name: recipe.name,
        ingredients: convertedIngredients,
        recipe: recipe.steps.join('\n'),
      })

    if (insertError) {
      setSaveMessage('レシピの保存に失敗しました。')
      setIsSavingRecipe(false)
      return
    }

    setSavedRecipeIds((current) => [...current, recipe.id])
    setSaveMessage('マイレシピに保存しました！')
    setIsSavingRecipe(false)
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] text-[#252b24]">
      <header className="border-b border-[#e7e8e1] bg-[#fbfbf9]">
        <div className="mx-auto flex h-[76px] max-w-[1180px] items-center justify-between px-6 lg:px-10">
          <button
            onClick={() => setSelected(null)}
            className="font-serif text-[26px] font-bold tracking-[-0.04em]"
          >
            komorebi
          </button>

          <div className="relative">
            <button
              aria-label="メニューを開く"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dfe2d9] bg-white text-[#4c5549] transition hover:bg-[#eef2e9]"
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>

            {menuOpen && (
              <nav className="absolute right-0 top-14 z-20 w-48 rounded-2xl border border-[#e2e5dc] bg-white p-2 text-sm shadow-xl">
                <button className="block w-full rounded-xl px-4 py-3 text-left hover:bg-[#f0f4ec]">
                  お気に入り一覧
                </button>
                <Link
                  href="/mypage"
                  className="block w-full rounded-xl px-4 py-3 text-left hover:bg-[#f0f4ec]"
                >
                  マイページ
                </Link>
                <Link
                  href="/login"
                  className="block w-full rounded-xl px-4 py-3 text-left hover:bg-[#f0f4ec]"
                >
                  ログイン
                </Link>
              </nav>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1180px] px-6 pb-14 pt-16 text-center lg:px-10 lg:pt-20">
        <p className="mb-4 text-sm font-medium tracking-[0.28em] text-[#7c8b76]">
          AI RECIPE SUGGESTION
        </p>

        <h1 className="font-serif text-[42px] font-bold leading-tight tracking-[-0.04em] text-[#283126] sm:text-[56px]">
          今日の献立、
          <br className="sm:hidden" />
          どうする？
        </h1>

        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-[#798078] sm:text-base">
          食材や気分、予算を入力するだけで、
          <br className="sm:hidden" />
          あなたにぴったりのレシピを提案します。
        </p>

        <div className="mx-auto mt-12 max-w-[790px] rounded-[28px] border border-[#e3e7de] bg-white p-2 shadow-[0_12px_40px_rgba(59,75,54,0.06)]">
          <div className="grid grid-cols-3 gap-1 rounded-[20px] bg-[#f5f7f2] p-1">
            {modes.map((item) => (
              <button
                key={item.key}
                onClick={() => setMode(item.key)}
                className={`rounded-2xl py-3 text-sm font-semibold transition ${
                  mode === item.key
                    ? 'bg-white text-[#52684e] shadow-sm'
                    : 'text-[#939a91] hover:text-[#52684e]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:p-5">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={activeMode.placeholder}
              className="h-14 min-w-0 flex-1 rounded-2xl bg-[#f7f8f5] px-5 text-sm outline-none placeholder:text-[#aeb5ac] focus:ring-2 focus:ring-[#cbd9c6]"
            />

            <button
              onClick={handleSearch}
              disabled={isGenerating}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#718b6a] px-7 text-sm font-bold text-white transition hover:bg-[#5d7857] disabled:cursor-wait disabled:opacity-70"
            >
              <Search size={18} />
              {isGenerating ? 'レシピを考え中…' : 'レシピを探す'}
            </button>
          </div>

          <p className="pb-3 text-xs text-[#9ba39a]">
            {activeMode.hint}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 pb-24 lg:px-10">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[#93a28d]">
              SUGGESTIONS FOR YOU
            </p>
            <h2 className="font-serif text-2xl font-bold tracking-[-0.03em]">
              {searched && query
                ? `「${query}」のおすすめ`
                : '今日のおすすめ'}
            </h2>
          </div>
          <p className="text-sm text-[#929a92]">
            {displayedRecipes.length}件のレシピ
          </p>
        </div>

        {searchError && (
          <p
            role="alert"
            className="mb-6 rounded-2xl bg-[#fff3ef] px-5 py-4 text-sm text-[#b86656]"
          >
            {searchError}
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          {displayedRecipes.map((recipe) => (
            <article
              key={recipe.id}
              className="group overflow-hidden rounded-[22px] border border-[#e8eae4] bg-white shadow-[0_8px_24px_rgba(50,65,47,0.04)]"
            >
              <div
                role="button"
                tabIndex={0}
                className="block w-full text-left"
                onClick={() => setSelected(recipe)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    setSelected(recipe)
                  }
                }}
              >
                <div className="relative aspect-[1.45] overflow-hidden">
                  <img
                    src={recipe.image}
                    alt={recipe.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />

                  <button
                    aria-label={`${recipe.name}をお気に入りに登録`}
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleFavorite(recipe.id)
                    }}
                    className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#718b6a] shadow-sm backdrop-blur transition hover:bg-white"
                  >
                    <Heart
                      size={19}
                      fill={
                        favorites.includes(recipe.id)
                          ? 'currentColor'
                          : 'none'
                      }
                    />
                  </button>
                </div>

                <div className="p-5">
                  {recipe.source && (
                    <p className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-[#7c8b76]">
                      {recipe.source === 'ai' ? 'AIレシピ' : 'オリジナルレシピ'}
                    </p>
                  )}
                  <h3 className="font-serif text-lg font-bold">
                    {recipe.name}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#7f877e]">
                    {recipe.description}
                  </p>
                  <p className="mt-4 text-xs text-[#a0a79f]">
                    {recipe.meta}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-[#263126]/35 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-white sm:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative aspect-[2/1] sm:aspect-[2.5/1]">
              <img
                src={selected.image}
                alt={selected.name}
                className="h-full w-full object-cover"
              />
              <button
                onClick={() => setSelected(null)}
                aria-label="詳細を閉じる"
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-6 sm:p-8">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#91a18b]">
                RECIPE DETAIL
              </p>
              <h2 className="mt-2 font-serif text-3xl font-bold">
                {selected.name}
              </h2>
              <p className="mt-3 text-sm text-[#7e867d]">
                {selected.meta}
              </p>

              <div className="mt-8 grid gap-8 sm:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <h3 className="mb-3 border-b border-[#e8ebe5] pb-2 font-bold">
                    材料
                  </h3>
                  <ul className="space-y-3 text-sm text-[#626b61]">
                    {selected.ingredients.map((ingredient) => (
                      <li key={ingredient} className="flex gap-2">
                        <span className="text-[#9bb092]">•</span>
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-3 border-b border-[#e8ebe5] pb-2 font-bold">
                    作り方
                  </h3>
                  <ol className="space-y-3 text-sm leading-6 text-[#626b61]">
                    {selected.steps.map((step, index) => (
                      <li key={step} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#edf3e9] text-xs font-bold text-[#6f8769]">
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => toggleFavorite(selected.id)}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-[#dce5d8] text-sm font-bold text-[#6d8467]"
                >
                  <Heart
                    size={17}
                    fill={
                      favorites.includes(selected.id)
                        ? 'currentColor'
                        : 'none'
                    }
                  />
                  {favorites.includes(selected.id)
                    ? 'お気に入り済み'
                    : 'お気に入りに登録'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveRecipe(selected)}
                  disabled={
                    isSavingRecipe ||
                    savedRecipeIds.includes(selected.id)
                  }
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#718b6a] px-5 text-sm font-bold text-white transition hover:bg-[#5d7857] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Bookmark
                    size={17}
                    fill={
                      savedRecipeIds.includes(selected.id)
                        ? 'currentColor'
                        : 'none'
                    }
                  />
                  {isSavingRecipe
                    ? '保存中…'
                    : savedRecipeIds.includes(selected.id)
                      ? '保存済み'
                      : 'マイレシピに保存'}
                </button>
              </div>

              {saveMessage && (
                <p
                  role="status"
                  className="mt-3 text-center text-sm text-[#718b6a]"
                >
                  {saveMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-[#e7e8e1] bg-[#fbfbf9] py-8 text-center text-xs text-[#9ba39a]">
        komorebi — 毎日の献立を、もっと軽やかに。
      </footer>
    </main>
  )
}
