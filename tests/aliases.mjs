/** Loaded via `--import` in the test script; installs the "@/" resolver hook. */
import { register } from "node:module";

register("./alias-hooks.mjs", import.meta.url);
