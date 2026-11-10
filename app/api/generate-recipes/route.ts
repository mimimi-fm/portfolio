import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
})

export const maxDuration = 30

const recipeSchema = z.object({
  recipes: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      cookingTimeMinutes: z.number().int().positive(),
      budgetYen: z.number().int().nonnegative(),
      ingredients: z.array(z.string().min(1)).min(1),
      steps: z.array(z.string().min(1)).min(1),
    }),
  ).length(3),
})

const requestSchema = z.object({
  mode: z.enum(['ingredients', 'mood', 'budget']),
  query: z.string().trim().min(1).max(300),
})

const modeLabels = {
  ingredients: '食材から探す',
  mood: '気分から探す',
  budget: '予算から探す',
} as const

function isUnavailableError(error: unknown) {
  const errorDetails = error as {
    statusCode?: unknown
    lastError?: { statusCode?: unknown; message?: unknown }
    errors?: Array<{ statusCode?: unknown; message?: unknown }>
    message?: unknown
  }
  const statusCodes = [
    errorDetails.statusCode,
    errorDetails.lastError?.statusCode,
    ...(errorDetails.errors ?? []).map((item) => item.statusCode),
  ]
  const errorMessage = [
    errorDetails.message,
    errorDetails.lastError?.message,
    ...(errorDetails.errors ?? []).map((item) => item.message),
  ]
    .filter((message): message is string => typeof message === 'string')
    .join(' ')

  return (
    statusCodes.some((code) => Number(code) === 503) ||
    /503|unavailable|overloaded|high demand/i.test(errorMessage)
  )
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: '検索条件を読み取れませんでした。' }, { status: 400 })
  }

  const parsedRequest = requestSchema.safeParse(body)

  if (!parsedRequest.success) {
    return Response.json({ error: '検索条件を入力してください。' }, { status: 400 })
  }

  const { mode, query } = parsedRequest.data
  const system = `あなたは日本の家庭料理に詳しいレシピ提案アシスタントです。${modeLabels[mode]}の条件に合わせ、1人分のレシピを3件提案してください。回答は必ず日本語で、一般的な家庭で手に入る食材と調味料を使ってください。予算は1人分の概算金額を円で示してください。`
  const prompt = `検索条件: ${query}

${mode === 'ingredients' ? '入力された食材をできるだけ無駄なく優先して使ってください。' : ''}${mode === 'mood' ? '入力された気分や料理のイメージに合う味わいと調理負担を考慮してください。' : ''}${mode === 'budget' ? '入力された予算を超えないようにしてください。予算は1人分の1食全体です。' : ''}

各レシピには、レシピ名、短い説明、調理時間（分）、1人分の概算予算（円）、材料と分量の文字列配列、工程ごとの作り方の文字列配列を含めてください。`

  const generateRecipeObject = (modelId: string) =>
    generateObject({
      model: google(modelId),
      schema: recipeSchema,
      system,
      maxRetries: 0,
      prompt,
    })

  try {
    let object

    try {
      ;({ object } = await generateRecipeObject('gemini-3.5-flash-lite'))
    } catch (error) {
      if (!isUnavailableError(error)) {
        throw error
      }

      console.warn('[generate-recipes] Falling back to gemini-3.8-flash')
      ;({ object } = await generateRecipeObject('gemini-3.8-flash'))
    }

    return Response.json(object)
  } catch (error) {
    console.error('[generate-recipes] Gemini request failed', error)

    if (isUnavailableError(error)) {
      return Response.json(
        { error: '現在アクセスが集中しています。少し時間をおいて、もう一度お試しください。' },
        { status: 503 },
      )
    }

    return Response.json(
      { error: 'レシピの生成に失敗しました。しばらくしてからもう一度お試しください。' },
      { status: 502 },
    )
  }
}
