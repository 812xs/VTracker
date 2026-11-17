import { isTauri } from "../session/tauri";

/** Uygulamayı kapatır (gizlemez). Tarayıcı önizlemesinde bir şey yapmaz. */
export async function closeApp(): Promise<void> {
  if (!isTauri()) return;
  const { exit } = await import("@tauri-apps/plugin-process");
  await exit(0);
}
