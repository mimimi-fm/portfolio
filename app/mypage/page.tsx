
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'

type Ingredient = {
  name: string
  quantity: string
}

type Recipe = {
  id: string
  recipe_name: string
  ingredients: Ingredient[]
  recipe: string
}

export default function MyPage() {
  const router = useRouter()

  const [username, setUsername] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)

  const [recipeName, setRecipeName] = useState('')
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', quantity: '' },
  ])
  const [instructions, setInstructions] = useState('')

  useEffect(() => {
    let isMounted = true
    const supabase = getSupabaseClient()

    const loadUser = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (!isMounted) return

      if (authError || !user) {
        router.replace('/login')
        return
      }

      setEmail(user.email ?? null)

      const { data: profile, error: profileError } = await supabase
        .from('userTable')
        .select('username')
        .eq('id', user.id)
        .single()

      if (!isMounted) return

      if (profileError) {
        setError('ユーザー情報を取得できませんでした。')
      } else {
        setUsername(profile?.username ?? null)
      }

      const { data: recipeData, error: recipeError } = await supabase
        .from('myrecipe')
        .select('id, recipe_name, ingredients, recipe')
        .eq('user_id', user.id)
        .order('recipe_name', { ascending: true })

      if (!isMounted) return

      if (recipeError) {
        setError('マイレシピを取得できませんでした。')
      } else {
        setRecipes((recipeData ?? []) as Recipe[])
      }

      setIsLoading(false)
    }

    loadUser()

    return () => {
      isMounted = false
    }
  }, [router])

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '' }])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (
    index: number,
    field: keyof Ingredient,
    value: string,
  ) => {
    setIngredients(
      ingredients.map((ingredient, i) =>
        i === index ? { ...ingredient, [field]: value } : ingredient,
      ),
    )
  }

  const resetForm = () => {
    setRecipeName('')
    setIngredients([{ name: '', quantity: '' }])
    setInstructions('')
    setEditingRecipeId(null)
    setIsFormOpen(false)
  }

  const startEditingRecipe = (recipe: Recipe) => {
    setError(null)
    setRecipeName(recipe.recipe_name)
    setIngredients(
      recipe.ingredients.length > 0
        ? recipe.ingredients
        : [{ name: '', quantity: '' }],
    )
    setInstructions(recipe.recipe)
    setEditingRecipeId(recipe.id)
    setIsFormOpen(true)
  }

  const handleDeleteRecipe = async (recipe: Recipe) => {
    if (!window.confirm(`「${recipe.recipe_name}」を削除しますか？`)) return

    setError(null)
    const supabase = getSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('ログイン状態を確認できませんでした。')
      return
    }

    const { error: deleteError } = await supabase
      .from('myrecipe')
      .delete()
      .eq('id', recipe.id)
      .eq('user_id', user.id)

    if (deleteError) {
      setError('レシピの削除に失敗しました。もう一度お試しください。')
      return
    }

    setRecipes((current) => current.filter((item) => item.id !== recipe.id))
    setSelectedRecipe(null)
  }

  const handleSaveRecipe = async () => {
    if (!recipeName.trim() || !instructions.trim()) {
      setError('レシピ名と作り方を入力してください。')
      return
    }

    const validIngredients = ingredients.filter(
      (item) => item.name.trim() && item.quantity.trim(),
    )

    if (validIngredients.length === 0) {
      setError('材料名と分量を1つ以上入力してください。')
      return
    }

    setIsSaving(true)
    setError(null)

    const supabase = getSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      setError('ログイン状態を確認できませんでした。')
      setIsSaving(false)
      return
    }

    const recipePayload = {
      recipe_name: recipeName.trim(),
      ingredients: validIngredients,
      recipe: instructions.trim(),
    }

    const recipeQuery = editingRecipeId
      ? supabase
          .from('myrecipe')
          .update(recipePayload)
          .eq('id', editingRecipeId)
          .eq('user_id', user.id)
      : supabase.from('myrecipe').insert({
          user_id: user.id,
          ...recipePayload,
        })

    const { data, error: saveError } = await recipeQuery
      .select('id, recipe_name, ingredients, recipe')
      .single()

    if (saveError) {
      setError(
        editingRecipeId
          ? 'レシピの更新に失敗しました。もう一度お試しください。'
          : 'レシピの保存に失敗しました。もう一度お試しください。',
      )
      setIsSaving(false)
      return
    }

    if (editingRecipeId) {
      setRecipes((current) =>
        current.map((item) =>
          item.id === editingRecipeId ? (data as Recipe) : item,
        ),
      )
      setSelectedRecipe(data as Recipe)
    } else {
      setRecipes((current) => [...current, data as Recipe])
    }

    resetForm()
    setIsSaving(false)
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setError(null)

    const { error: signOutError } =
      await getSupabaseClient().auth.signOut()

    if (signOutError) {
      setError('ログアウトに失敗しました。もう一度お試しください。')
      setIsSigningOut(false)
      return
    }

    router.replace('/login')
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-5 py-8 text-[#3d3935] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-12 inline-flex items-center gap-2 text-sm text-[#817a72] transition-colors hover:text-[#5f7668]"
        >
          <span aria-hidden="true">←</span>
          トップページへ戻る
        </Link>

        <section className="rounded-2xl border border-[#e8e2d9] bg-[#fcfbf8] p-7 shadow-[0_14px_40px_rgba(89,78,64,0.06)] sm:p-10">
          <p className="mb-3 text-xs tracking-[0.22em] text-[#8e9a8d]">
            MY PAGE
          </p>
          <h1 className="font-serif text-3xl font-medium tracking-[0.08em] text-[#504b45] sm:text-4xl">
            マイページ
          </h1>

          {isLoading ? (
            <p className="mt-10 text-sm text-[#8a837b]">
              ユーザー情報を読み込んでいます…
            </p>
          ) : (
            <div className="mt-10 space-y-7">
              <div className="border-b border-[#ebe5dd] pb-6">
                <p className="text-xs tracking-[0.16em] text-[#9b948c]">
                  USERNAME
                </p>
                <p className="mt-2 text-xl text-[#5d6960]">
                  {username || 'ユーザー名未設定'}
                </p>
              </div>

              {email && (
                <div className="border-b border-[#ebe5dd] pb-6">
                  <p className="text-xs tracking-[0.16em] text-[#9b948c]">
                    EMAIL
                  </p>
                  <p className="mt-2 text-sm text-[#716b64]">{email}</p>
                </div>
              )}

              <div className="border-b border-[#ebe5dd] pb-8">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs tracking-[0.16em] text-[#9b948c]">
                      MY RECIPES
                    </p>
                    <h2 className="mt-1 text-xl font-medium text-[#504b45]">
                      マイレシピ
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setError(null)
                      setIsFormOpen(!isFormOpen)
                    }}
                    className="flex items-center gap-2 rounded-full border border-[#cbd5c9] px-4 py-2 text-sm text-[#5f7668] transition-colors hover:bg-[#f0f4ec]"
                  >
                    {isFormOpen ? (
                      <X size={16} />
                    ) : (
                      <Pencil size={16} />
                    )}
                    {isFormOpen ? '閉じる' : 'レシピを追加'}
                  </button>
                </div>

                {isFormOpen && (
                  <div className="mb-6 space-y-5 rounded-xl border border-[#e8e2d9] bg-[#f9f7f2] p-5">
                    <h3 className="font-medium text-[#5d6960]">
                      {editingRecipeId ? 'レシピを編集' : '新しいレシピを登録'}
                    </h3>

                    <div>
                      <label className="mb-2 block text-sm">
                        レシピ名
                      </label>
                      <input
                        value={recipeName}
                        onChange={(e) => setRecipeName(e.target.value)}
                        placeholder="例：豚こまと野菜の炒め物"
                        className="w-full rounded-lg border border-[#ded8cf] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#8e9a8d]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm">材料・分量</label>
                      <div className="space-y-3">
                        {ingredients.map((ingredient, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2"
                          >
                            <input
                              value={ingredient.name}
                              onChange={(e) =>
                                updateIngredient(index, 'name', e.target.value)
                              }
                              placeholder="材料名"
                              className="min-w-0 flex-1 rounded-lg border border-[#ded8cf] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#8e9a8d]"
                            />
                            <input
                              value={ingredient.quantity}
                              onChange={(e) =>
                                updateIngredient(
                                  index,
                                  'quantity',
                                  e.target.value,
                                )
                              }
                              placeholder="分量"
                              className="w-24 rounded-lg border border-[#ded8cf] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#8e9a8d]"
                            />
                            <button
                              type="button"
                              onClick={() => removeIngredient(index)}
                              disabled={ingredients.length === 1}
                              aria-label="材料を削除"
                              className="rounded-lg p-2 text-[#a58d82] hover:bg-[#f0eae4] disabled:opacity-30"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={addIngredient}
                        className="mt-3 inline-flex items-center gap-1 text-sm text-[#5f7668] hover:underline"
                      >
                        <Plus size={16} />
                        材料を追加
                      </button>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm">作り方</label>
                      <textarea
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="作り方を入力してください"
                        rows={5}
                        className="w-full resize-y rounded-lg border border-[#ded8cf] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#8e9a8d]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveRecipe}
                      disabled={isSaving}
                      className="w-full rounded-xl bg-[#718675] px-5 py-3 text-sm tracking-[0.1em] text-white transition-colors hover:bg-[#5f7668] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? '保存しています…' : 'レシピを保存'}
                    </button>
                  </div>
                )}

                {recipes.length === 0 ? (
                  <p className="rounded-xl bg-[#f7f5f0] px-4 py-8 text-center text-sm text-[#948d84]">
                    まだレシピが登録されていません。
                    <br />
                    自分だけのレシピを追加してみましょう。
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recipes.map((recipe) => (
                      <article
                        key={recipe.id}
                        className="rounded-xl border border-[#e8e2d9] bg-white p-4"
                      >
    <button
      type="button"
      onClick={() =>
        setSelectedRecipe(
          selectedRecipe?.id === recipe.id ? null : recipe,
        )
      }
      aria-expanded={selectedRecipe?.id === recipe.id}
      className="w-full text-left"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-[#504b45]">
          {recipe.recipe_name}
        </h3>
        <span className="text-sm text-[#8e9a8d]">
          {selectedRecipe?.id === recipe.id ? '閉じる −' : '詳細を見る ＋'}
        </span>
      </div>

      <p className="mt-2 text-xs text-[#8a837b]">
        材料：{recipe.ingredients
          .map((item) => item.name)
          .join('・')}
      </p>
    </button>

    {selectedRecipe?.id === recipe.id && (
      <div className="mt-5 border-t border-[#ebe5dd] pt-5">
        <h4 className="mb-3 text-sm font-medium text-[#5d6960]">
          材料・分量
        </h4>

        <ul className="space-y-2">
          {recipe.ingredients.map((item, index) => (
            <li
              key={index}
              className="flex justify-between gap-4 text-sm text-[#716b64]"
            >
              <span>{item.name}</span>
              <span>{item.quantity}</span>
            </li>
          ))}
        </ul>

        <h4 className="mb-3 mt-6 text-sm font-medium text-[#5d6960]">
          作り方
        </h4>

        <p className="whitespace-pre-wrap text-sm leading-7 text-[#716b64]">
          {recipe.recipe}
        </p>

        <div className="mt-6 flex gap-3 border-t border-[#ebe5dd] pt-5">
          <button
            type="button"
            onClick={() => startEditingRecipe(recipe)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#cbd5c9] px-4 py-2 text-sm text-[#5f7668] transition-colors hover:bg-[#f0f4ec]"
          >
            <Pencil size={15} />
            編集
          </button>
          <button
            type="button"
            onClick={() => handleDeleteRecipe(recipe)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#e2cfc8] px-4 py-2 text-sm text-[#a56e64] transition-colors hover:bg-[#fbf1ee]"
          >
            <Trash2 size={15} />
            削除
          </button>
        </div>
      </div>
    )}
  </article>
))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full rounded-xl border border-[#d8cfc3] bg-transparent px-5 py-3 text-sm tracking-[0.12em] text-[#706961] transition-colors hover:border-[#b9a99a] hover:bg-[#f5f0e9] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSigningOut ? 'ログアウトしています…' : 'ログアウト'}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
