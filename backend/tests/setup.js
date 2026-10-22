import path from "path";

process.env.JWT_SECRET = "test-secret";
process.env.DB_STORAGE = ":memory:";
// Tests run against a small fixture, independent of the real guides in data/guides.
process.env.GUIDES_DIR = path.resolve("tests/fixtures/guides");
