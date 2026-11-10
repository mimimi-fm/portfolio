import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      return NextResponse.json(
        {
          connected: false,
          message: "Supabaseへの接続確認に失敗しました。",
          error: error.message,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      connected: true,
      message: "Supabaseへの接続を確認しました。",
      hasSession: Boolean(session),
    })
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        message: "Supabaseの設定または接続確認でエラーが発生しました。",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
