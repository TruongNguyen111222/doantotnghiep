"use client";
//File này là một bộ nhớ đệm Lưu dữ liệu tạm trong RAM
//để khỏi gọi API nhiều lần.
type Entry<T> = { //kiểu dữ liệu cho bộ nhớ đệm
  value: T; //giá trị của bộ nhớ đệm
  updatedAt: number; //thời gian cập nhật
};

const QUERY_CACHE = new Map<string, Entry<unknown>>(); //QUERY_CACHE là một Map trong RAM — tồn tại suốt vòng đời tab trình duyệt

export function hasCachedValue(key: string): boolean { //kiểm tra xem bộ nhớ đệm có giá trị không
  return QUERY_CACHE.has(key); //trả về true nếu bộ nhớ đệm có giá trị, false nếu không
}

export function getCachedValue<T>(key: string): T | undefined { //lấy giá trị của bộ nhớ đệm
  const hit = QUERY_CACHE.get(key); //lấy giá trị của bộ nhớ đệm
  return hit ? (hit.value as T) : undefined; //trả về giá trị của bộ nhớ đệm nếu có, undefined nếu không
}

export async function getOrFetchCached<T>( //lấy giá trị của bộ nhớ đệm hoặc fetch từ API Nếu cache có rồi → dùng cache
                                           //Nếu chưa có → gọi API rồi lưu cache
  key: string,
  fetcher: () => Promise<T>, //hàm fetch từ API
  options?: { force?: boolean }
): Promise<T> {
  const force = Boolean(options?.force); //kiểm tra xem có force không
  if (!force) { //nếu không có force thì lấy giá trị của bộ nhớ đệm
    const hit = QUERY_CACHE.get(key); //lấy giá trị của bộ nhớ đệm
    if (hit) return hit.value as T; //trả về giá trị của bộ nhớ đệm nếu có
  }
  const fresh = await fetcher(); //gọi API
  QUERY_CACHE.set(key, { value: fresh as unknown, updatedAt: Date.now() }); //lưu giá trị của bộ nhớ đệm
  return fresh; //trả về giá trị của bộ nhớ đệm
}

export function setCachedValue<T>(key: string, value: T) { //lưu giá trị của bộ nhớ đệm
  QUERY_CACHE.set(key, { value: value as unknown, updatedAt: Date.now() }); //lưu giá trị của bộ nhớ đệm
}

export function deleteCacheByPrefix(prefix: string) { //xóa bộ nhớ đệm theo prefix
  for (const key of QUERY_CACHE.keys()) { //lấy tất cả các key của bộ nhớ đệm
    if (key.startsWith(prefix)) QUERY_CACHE.delete(key); //xóa bộ nhớ đệm nếu key bắt đầu với prefix
  }
}

export function clearAllQueryCache() { //xóa tất cả bộ nhớ đệm
  QUERY_CACHE.clear();
}

export type FetchResponseCacheEntry = { //kiểu dữ liệu cho bộ nhớ đệm fetch response
  bodyText: string; //body của response
  status: number; //status của response
  statusText: string; //status text của response
  headers: Record<string, string>; //headers của response
};

export function clearFetchResponseCache() { //xóa bộ nhớ đệm fetch response
  if (typeof window === "undefined") return; //nếu window không tồn tại thì không xóa bộ nhớ đệm
  try {
    const g = window as typeof window & { __manageUtcFetchCache?: Map<string, FetchResponseCacheEntry> }; //lấy window và gán vào g
    g.__manageUtcFetchCache?.clear(); //xóa bộ nhớ đệm fetch response
  } catch {
    // ignore //nếu có lỗi thì không xóa bộ nhớ đệm
  }
}

/** RAM-only query cache + in-memory GET fetch cache — gọi khi đăng xuất / sau mutation có reload. */
export function clearAllClientCaches() { //xóa tất cả bộ nhớ đệm
  clearAllQueryCache(); //xóa tất cả bộ nhớ đệm
  clearFetchResponseCache(); //xóa bộ nhớ đệm fetch response
  if (typeof window !== "undefined") { //nếu window tồn tại thì xóa bộ nhớ đệm
    try {
      localStorage.removeItem("manage_utc:query_cache_v1"); //xóa bộ nhớ đệm query
      localStorage.removeItem("manage_utc:fetch_cache_v1"); //xóa bộ nhớ đệm fetch
    } catch {
      // ignore //nếu có lỗi thì không xóa bộ nhớ đệm
    }
  }
} //xóa tất cả bộ nhớ đệm
