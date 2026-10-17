/**
 * Standalone Backend Diagnostic Script for Live FinBERT Inference Connectivity
 * 
 * Usage:
 *   npx tsx scripts/test_live_finbert.ts
 * 
 * Safety:
 *   Never exposes or prints the HF_TOKEN or authorization headers.
 */
import dns from 'dns';
import { runFinbertInference, PRIMARY_FINBERT_ENDPOINT, SECONDARY_FINBERT_ENDPOINT } from '../src/finbertService';

async function main() {
  console.log('================================================================');
  console.log('   NEXUS STOCK SENTIMENT — LIVE FINBERT INFERENCE PROBE');
  console.log('================================================================\n');

  // 1. Environment & Token Configuration Check (Non-leaking)
  const rawToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || process.env.HUGGING_FACE_HUB_TOKEN || '';
  const cleanToken = rawToken.replace(/["'\r\n]/g, '').trim();
  const tokenPresent = Boolean(cleanToken);
  const tokenLength = cleanToken.length;
  const tokenPrefixValid = cleanToken.startsWith('hf_');

  console.log('[1] Token Environment Check:');
  console.log(`  - Token configured:    ${tokenPresent ? 'YES' : 'NO (HF_TOKEN not set)'}`);
  if (tokenPresent) {
    console.log(`  - Token character len: ${tokenLength}`);
    console.log(`  - Format check:        ${tokenPrefixValid ? 'VALID (starts with "hf_")' : 'INVALID (must start with "hf_")'}`);
  } else {
    console.log('  - Notice:              Set HF_TOKEN="hf_..." in your environment or Render dashboard.');
  }

  // 2. DNS Resolution Verification for Inference Router
  console.log('\n[2] DNS Resolution Check:');
  const domainsToCheck = ['router.huggingface.co'];
  for (const domain of domainsToCheck) {
    await new Promise<void>((resolve) => {
      dns.lookup(domain, (err, address) => {
        if (err) {
          console.log(`  - ${domain}: FAILED (${err.code})`);
        } else {
          console.log(`  - ${domain}: RESOLVED -> ${address}`);
        }
        resolve();
      });
    });
  }

  // 3. Candidate Endpoints
  const configuredEndpoint = process.env.HF_INFERENCE_ENDPOINT || PRIMARY_FINBERT_ENDPOINT;
  console.log('\n[3] Target Inference Endpoint:');
  console.log(`  - Configured: ${configuredEndpoint}`);
  console.log(`  - Secondary:  ${SECONDARY_FINBERT_ENDPOINT}`);

  // 4. Real Live Inference Probe
  console.log('\n[4] Executing Real Inference Probe (single fixed sentence)...');
  const probeSentence = 'Operating profit margins expanded by 18% during the recent quarter.';
  console.log(`  - Test input: "${probeSentence}"`);

  const startTime = Date.now();
  const result = await runFinbertInference([probeSentence]);
  const elapsed = Date.now() - startTime;

  console.log(`  - Elapsed time: ${elapsed}ms`);
  console.log(`  - Inference status: ${result.status}`);
  console.log(`  - Diagnostic reason: ${result.diagnostics.reason || 'NONE'}`);
  console.log(`  - Diagnostic message: ${result.diagnostics.message || 'None'}`);

  if (result.status === 'LIVE' && result.overallScore !== null) {
    console.log(`  - Parsed Sentiment Score: ${result.overallScore > 0 ? '+' : ''}${result.overallScore}`);
    const item = result.items[0];
    if (item) {
      console.log(`  - Classification Label:   ${item.label}`);
      console.log(`  - Probabilities:          Positive: ${item.probabilities.positive}, Neutral: ${item.probabilities.neutral}, Negative: ${item.probabilities.negative}`);
    }
    console.log('\n================================================================');
    console.log('✓ REAL FINBERT INFERENCE VERIFIED AND OPERATIONAL!');
    console.log('================================================================');
    process.exit(0);
  } else {
    console.log('\n================================================================');
    console.log(`! FINBERT IS CURRENTLY OFFLINE (${result.diagnostics.reason || 'UNAVAILABLE'})`);
    console.log('  Action required:');
    if (result.diagnostics.reason === 'MISSING_TOKEN') {
      console.log('  -> Configure HF_TOKEN in your Render service environment variables.');
    } else if (result.diagnostics.reason === 'INVALID_CREDENTIALS') {
      console.log('  -> Check that your HF_TOKEN is an active token starting with "hf_".');
    } else if (result.diagnostics.reason === 'INSUFFICIENT_ACCESS') {
      console.log('  -> Ensure your HF token has "Make calls to Inference Providers" or "Read" access.');
    } else if (result.diagnostics.reason === 'NETWORK_ERROR') {
      console.log('  -> Check network/firewall/DNS settings or unset HF_INFERENCE_ENDPOINT.');
    }
    console.log('================================================================');
  }
}

main().catch((err) => {
  console.error('[Fatal Error in live probe]:', err);
  process.exit(1);
});
