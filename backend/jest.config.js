export default {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/setup.js"],
  transform: {
    "^.+\\.js$": "babel-jest"
  }
};
