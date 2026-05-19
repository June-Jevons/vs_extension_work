import * as assert from "assert";
import { mergeChangedFileInputs } from "../../src/core/liveChangeInputs";

assert.deepStrictEqual(mergeChangedFileInputs([], ["src/app/main.py"], []), [
  {
    path: "src/app/main.py",
    status: "modified"
  }
]);

assert.deepStrictEqual(mergeChangedFileInputs([
  {
    path: "src/app/main.py",
    status: "added"
  }
], ["src/app/main.py", "src/app/config.py"], ["src/app/old.py"]), [
  {
    path: "src/app/config.py",
    status: "modified"
  },
  {
    path: "src/app/main.py",
    status: "added"
  },
  {
    path: "src/app/old.py",
    status: "deleted"
  }
]);

console.log("Live change input merge checks passed.");
