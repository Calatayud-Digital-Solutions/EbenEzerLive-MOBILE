import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

export const PERSISTENT_CLIENT_ID_STORAGE_KEY =
  "ebenezer.listener.persistentClientId";

export type IdentifyPayload = {
  type: "identify";
  clientId: string;
};

export async function getOrCreatePersistentClientId(
  storage: Pick<typeof AsyncStorage, "getItem" | "setItem"> = AsyncStorage,
  randomUuid: () => string = () => Crypto.randomUUID()
): Promise<string> {
  const existing = await storage.getItem(PERSISTENT_CLIENT_ID_STORAGE_KEY);
  if (existing && existing.length > 0) {
    return existing;
  }
  const clientId = randomUuid();
  await storage.setItem(PERSISTENT_CLIENT_ID_STORAGE_KEY, clientId);
  return clientId;
}

export function buildIdentifyPayload(clientId: string): IdentifyPayload {
  return { type: "identify", clientId };
}
