import { invoke } from "@tauri-apps/api/core";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Tauri komutunu çağırır; hata metni kullanıcıya gösterilecek kısa cümledir. */
export async function call<T>(command: string): Promise<T> {
  try {
    return await invoke<T>(command);
  } catch (e) {
    throw new Error(typeof e === "string" ? e : "Veri alınamadı.");
  }
}
