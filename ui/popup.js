document.getElementById("open-game").addEventListener("click", async () => {
  const url = browser.runtime.getURL("src/ui/game.html");
  await browser.tabs.create({ url });
});
document.getElementById("play").addEventListener("click", () => {});
document.getElementById("pause").addEventListener("click", () => {});
document.getElementById("reset").addEventListener("click", () => {});
document.getElementById("save1").addEventListener("click", async () => {
  await browser.storage.local.set({ slot1: {version:0, parts:[], goal:{}} });
});
document.getElementById("save2").addEventListener("click", async () => {
  await browser.storage.local.set({ slot2: {version:0, parts:[], goal:{}} });
});
document.getElementById("save3").addEventListener("click", async () => {
  await browser.storage.local.set({ slot3: {version:0, parts:[], goal:{}} });
});
document.getElementById("load1").addEventListener("click", async () => { await browser.storage.local.get("slot1"); });
document.getElementById("load2").addEventListener("click", async () => { await browser.storage.local.get("slot2"); });
document.getElementById("load3").addEventListener("click", async () => { await browser.storage.local.get("slot3"); });
