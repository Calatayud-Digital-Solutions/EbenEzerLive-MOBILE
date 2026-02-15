module.exports = {
  preset: "jest-expo",
  setupFiles: ["./jest.setup.js"],
  moduleNameMapper: {
    "^@env$": "<rootDir>/__mocks__/@env.js",
    "^expo/src/winter$": "<rootDir>/__mocks__/expoWinter.js",
    "\\.(png|jpg|jpeg|gif|webp|svg)$": "<rootDir>/__mocks__/fileMock.js"
  },
};
