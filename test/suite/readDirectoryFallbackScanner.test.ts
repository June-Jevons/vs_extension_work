import * as assert from "assert";
import {
  DirectoryEntryLike,
  scanReadDirectoryTree
} from "../../src/core/readDirectoryFallbackScanner";

type MemoryTree = {
  [path: string]: DirectoryEntryLike[];
};

const tree: MemoryTree = {
  "": [
    { name: "src", kind: "directory" },
    { name: "tests", kind: "directory" },
    { name: "build", kind: "directory" },
    { name: "README.md", kind: "file" }
  ],
  "src": [
    { name: "robot", kind: "directory" },
    { name: "setup.py", kind: "file" }
  ],
  "src/robot": [
    { name: "controller.py", kind: "file" },
    { name: "config.yaml", kind: "file" }
  ],
  "tests": [
    { name: "test_controller.py", kind: "file" }
  ],
  "build": [
    { name: "generated.py", kind: "file" }
  ]
};

void run()
  .then(() => {
    console.log("Read-directory fallback scanner checks passed.");
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });

async function run(): Promise<void> {
  const result = await scanReadDirectoryTree("", {
    excludeGlobs: ["**/build/**"],
    maxFilesToAnalyze: 20
  }, {
    readDirectory: async (location) => {
      const entries = tree[location];
      if (!entries) {
        throw new Error(`Unreadable: ${location}`);
      }
      return entries;
    },
    joinPath: (location, segment) => location ? `${location}/${segment}` : segment,
    relativePath: (_root, location) => location
  });

  const files = result.files.sort();
  assert.deepStrictEqual(files, [
    "README.md",
    "src/robot/config.yaml",
    "src/robot/controller.py",
    "src/setup.py",
    "tests/test_controller.py"
  ]);
  assert.strictEqual(result.unreadablePaths.length, 0);
  assert.ok(!files.includes("build/generated.py"), "excluded folders should not be scanned");
}
