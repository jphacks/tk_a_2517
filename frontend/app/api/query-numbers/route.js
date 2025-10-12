// app/api/query-numbers/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_KEY = 'query_numbers';
const MAX_LEN = 200; // 保持上限（必要に応じて変更）

function readList() {
  const raw = cookies().get(COOKIE_KEY)?.value;
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeList(list) {
  const res = NextResponse.json({ ok: true, list });
  res.cookies.set(COOKIE_KEY, JSON.stringify(list), {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: true,           // ローカル http で試すなら一時的に false
    maxAge: 60 * 60 * 24 * 365, // 1年
  });
  return res;
}

export async function GET() {
  const list = readList();
  return NextResponse.json({ list }, { status: 200 });
}

export async function POST(request) {
  // 受け取り: { value: number | string } あるいはクエリ ?value=...
  const url = new URL(request.url);
  let payload = null;

  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      payload = await request.json();
    }
  } catch { /* no-op */ }

  const vRaw =
    payload?.value ??
    url.searchParams.get('value');

  // 数値として正規化
  const n = Number(vRaw);
  if (!Number.isFinite(n)) {
    return NextResponse.json(
      { error: 'value must be a finite number' },
      { status: 400 }
    );
  }

  const list = readList();

  // 文字列で持つか数値で持つかはお好み。ここでは数値で保存。
  // 既に存在するならスキップ（重複排除）。新しい値は末尾に追加。
  if (!list.includes(n)) {
    list.push(n);
    // 上限超なら先頭から削除（FIFO）
    while (list.length > MAX_LEN) list.shift();
  }

  return writeList(list);
}
