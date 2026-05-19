import FingerprintJS from "@fingerprintjs/fingerprintjs";

const STORAGE_KEY = "onariam-device-id";

let loadPromise: Promise<string> | null = null;

export async function getDeviceId(): Promise<string> {
  if (typeof window === "undefined") {
    return "";
  }

  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    return cached;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      const agent = await FingerprintJS.load();
      const { visitorId } = await agent.get();
      localStorage.setItem(STORAGE_KEY, visitorId);
      return visitorId;
    })();
  }

  return loadPromise;
}
