export async function saveLevel(slot, level) {
  await browser.storage.local.set({ ["slot"+slot]: level });
}
export async function loadLevel(slot) {
  const res = await browser.storage.local.get("slot"+slot);
  return res["slot"+slot] || null;
}
