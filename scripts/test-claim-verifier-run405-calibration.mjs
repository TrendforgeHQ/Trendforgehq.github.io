import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildAuthoritativeEvidencePack} from './authoritative-evidence-pack.mjs';

// Durable reconstruction: the original Run 405 artifact expired. The article and
// article brief remain committed in the repository, but the archived evidence-pack
// file is empty. Rebuild a clearly-labelled pack from the brief's saved grounding
// passages. This is a repeatable regression fixture, NOT an exact replay of the
// original historical evidence pack.
const target=path.resolve('data/article-attempts/20260922-184621-san-francisco-files-suit-against-trump-media-over-paid-early-access-service');
const articlePath=path.join(target,'article.md');
const briefPath=path.join(target,'article-brief.json');
for(const p of [articlePath,briefPath]) if(!fs.existsSync(p)) throw new Error(`Durable Run 405 fixture missing: ${p}`);

const brief=JSON.parse(fs.readFileSync(briefPath,'utf8'));
const groundingSources=brief?.grounding?.sources;
if(!brief?.brief?.title||!Array.isArray(groundingSources)||groundingSources.length===0) {
  throw new Error('Durable Run 405 fixture lacks the brief title or saved grounding sources.');
}
const sources=groundingSources.map((source,index)=>{
  let domain='';
  try { domain=new URL(source.url).hostname; if(domain.startsWith('www.')) domain=domain.slice(4); } catch {}
  return {
    title:source.title||brief.brief.title,
    url:source.url||'',
    domain,
    publisherFamily:domain,
    verified:true,
    primary:false,
    sourceRole:source.role||'CONTEXT',
    credibilityTier:'unknown',
    lineage:{id:`run405-brief-reconstruction-${index+1}`,type:'archived-brief-grounding',members:1},
    passages:Array.isArray(source.passages)?source.passages:[],
    body:source.articleBody||'',
    extraction:{kind:source.kind||'archived-brief-grounding'}
  };
});
const pack=buildAuthoritativeEvidencePack({
  candidate:{title:brief.brief.title,link:brief.brief.sources?.[0]?.url||sources[0].url,category:brief.brief.category||''},
  sources,
  coverage:brief.grounding,
  blueprint:brief.blueprint||{},
  evidenceBrief:null,
  generatedAt:brief.generatedAt||'2026-09-22T18:46:19.537Z'
});
const root=fs.mkdtempSync(path.join(os.tmpdir(),'trendforge-run405-durable-'));
const evidencePath=path.join(root,'authoritative-evidence-pack.json');
const out=path.join(root,'claim-verification.json');
fs.writeFileSync(evidencePath,JSON.stringify({candidates:[pack]},null,2)+String.fromCharCode(10));

const result=spawnSync(process.execPath,['scripts/verify-article-claims-smart.mjs'],{
  env:{
    ...process.env,
    TREND_FORGE_VERIFY_ARTICLE_DIR:target,
    TREND_FORGE_VERIFY_BRIEF_PATH:briefPath,
    TREND_FORGE_VERIFY_EVIDENCE_PACK_PATH:evidencePath,
    TREND_FORGE_VERIFY_OUTPUT:out,
    GITHUB_RUN_ID:'35768815681'
  },
  encoding:'utf8'
});
process.stdout.write(result.stdout||'');
process.stderr.write(result.stderr||'');
if(!fs.existsSync(out)) throw new Error('Durable Run 405 verifier produced no claim-verification output.');
const report=JSON.parse(fs.readFileSync(out,'utf8'));
console.log(`Durable Run 405 reconstruction baseline: ${report.verified} supported, ${report.partial} partial, ${report.unsupported} unsupported, average confidence ${report.averageConfidence}`);
for(const c of report.claims) console.log(`C${c.index}: ${c.status} / ${c.classification} / ${c.confidence} / ${c.matchingMode||'-'} — ${c.claim}`);
console.log('Fixture provenance: committed archived article + article brief; evidence pack reconstructed from saved grounding passages.');
console.log('Caveat: this is not an exact replay because the original historical evidence-pack artifact is unavailable.');
console.log('Historical target 11/2/2 remains unverified; it must not be inferred from this reconstructed pack.');
if(!fs.existsSync(out)) throw new Error('Durable Run 405 verifier produced no claim-verification output.');
if(result.status!==1) throw new Error(`Expected the verifier to block this fixture with exit code 1; got ${result.status}.`);
if(report.claimCount!==15||report.verified!==9||report.partial!==3||report.unsupported!==3||report.sourceUnavailable!==0||report.pass!==false) {
  throw new Error(`Durable reconstruction baseline changed: expected 15 claims / 9 supported / 3 partial / 3 unsupported / 0 source-unavailable / blocked, got ${report.claimCount} / ${report.verified} / ${report.partial} / ${report.unsupported} / ${report.sourceUnavailable} / pass=${report.pass}.`);
}
console.log('Durable reconstructed regression baseline: PASS (9 supported / 3 partial / 3 unsupported; verifier correctly blocks).');
