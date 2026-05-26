import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  PERSISTENT_CLIENT_ID_STORAGE_KEY,
  buildIdentifyPayload,
  getOrCreatePersistentClientId,
} from "../src/streaming/persistentClientId";

describe("persistentClientId", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("returns stored clientId when present", async () => {
    await AsyncStorage.setItem(
      PERSISTENT_CLIENT_ID_STORAGE_KEY,
      "stored-client-id"
    );
    const storage = {
      getItem: AsyncStorage.getItem.bind(AsyncStorage),
      setItem: AsyncStorage.setItem.bind(AsyncStorage),
    };
    const id = await getOrCreatePersistentClientId(storage, () => "new-id");
    expect(id).toBe("stored-client-id");
  });

  it("creates and persists a new clientId when missing", async () => {
    const storage = {
      getItem: jest.fn().mockResolvedValue(null),
      setItem: jest.fn().mockResolvedValue(undefined),
    };
    const id = await getOrCreatePersistentClientId(storage, () => "generated-id");
    expect(id).toBe("generated-id");
    expect(storage.setItem).toHaveBeenCalledWith(
      PERSISTENT_CLIENT_ID_STORAGE_KEY,
      "generated-id"
    );
  });

  it("builds identify payload", () => {
    expect(buildIdentifyPayload("abc-123")).toEqual({
      type: "identify",
      clientId: "abc-123",
    });
  });
});
