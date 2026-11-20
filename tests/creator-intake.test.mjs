import test from "node:test";
import assert from "node:assert/strict";
import { decodeRights, parseRights } from "../lib/portal/creator-intake.ts";

const rights = first => decodeRights(JSON.stringify({
  mode: "shared",
  contributors: [{ first, last: "", role: "author" }],
  claimants: [{ first: "Inez", last: "", role: "" }],
  territory: "PH",
}));

test("new contributor name fields allow ten characters", () => {
  assert.equal(parseRights(rights("Abcdefghij"), true).values.contributors[0].first, "Abcdefghij");
  assert.match(parseRights(rights("Abcdefghijk"), true).error, /up to 10/);
});

test("existing longer names can be preserved in later revisions", () => {
  const previous = rights("Abcdefghijk");
  assert.equal(parseRights(previous, true, previous).values.contributors[0].first, "Abcdefghijk");
  assert.match(parseRights(rights("Abcdefghijl"), true, previous).error, /up to 10/);
});
