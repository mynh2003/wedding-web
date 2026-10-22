import assert from "node:assert/strict";
import fs from "node:fs";
import sharp from "sharp";
import test from "node:test";

test("optimized static artwork is smaller with matching dimensions and lossless alpha", async () => {
  const report=JSON.parse(fs.readFileSync("docs/image-optimization.json","utf8"));
  for(const asset of report.assets){
    const before=await sharp(`source-assets${asset.source}`).metadata();
    const after=await sharp(`public${asset.target}`).metadata();
    assert.equal(after.format,"webp");assert.equal(after.width,before.width,asset.target);assert.equal(after.height,before.height,asset.target);assert.equal(after.hasAlpha,before.hasAlpha,asset.target);
    assert.ok(fs.statSync(`public${asset.target}`).size<asset.before,asset.target);
    if(before.hasAlpha)assert.deepEqual(await sharp(`public${asset.target}`).extractChannel("alpha").raw().toBuffer(),await sharp(`source-assets${asset.source}`).extractChannel("alpha").raw().toBuffer(),asset.target);
  }
  assert.ok(report.optimizedBytes<report.originalBytes*0.6);
});
