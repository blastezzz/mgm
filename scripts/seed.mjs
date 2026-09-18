/**
 * Seeds demo claims so the board has something to render.
 *   node scripts/seed.mjs         — add demo claims
 *   node scripts/seed.mjs --reset — wipe every claim first
 *
 * Each demo claim gets a throwaway wallet that really signs its claim message,
 * so the "signature verified" badges on the site are honest.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { db } from "../lib/db.ts";
import { claimMessage, SITE } from "../lib/signing.ts";

const root = process.cwd();
const upDir = path.join(root, "public", "uploads");
fs.mkdirSync(upDir, { recursive: true });

if (process.argv.includes("--reset")) {
  for (const p of db.prepare("SELECT path FROM proofs").all()) {
    const base = path.basename(p.path);
    if (base.startsWith("demo-")) fs.rmSync(path.join(upDir, base), { force: true });
  }
  db.exec("DELETE FROM supports; DELETE FROM proofs; DELETE FROM cases; DELETE FROM nonces;");
  console.log("• wiped existing claims");
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Mock explorer / wallet screenshot as an SVG file. */
function proofSvg({ kind, token, amount, addr, pct }) {
  const rows = {
    explorer: [
      ["Transaction", "0x" + crypto.randomBytes(8).toString("hex") + "…"],
      ["Network", "Arc"],
      ["Status", "Success"],
      ["Token", token],
      ["Value", `-$${amount.toLocaleString("en-US")} USDC`],
      ["From", addr.slice(0, 18) + "…"],
    ],
    wallet: [
      [token, `-${pct}%`],
      ["Avg buy", `$${(amount / 1000).toFixed(4)}`],
      ["Now", `$${((amount / 1000) * (1 - pct / 100)).toFixed(5)}`],
      ["P&L", `-$${amount.toLocaleString("en-US")}`],
      ["Holders", "-83% (24h)"],
    ],
    chat: [
      ["dev", "lp is locked for 12 months ser"],
      ["dev", "cex listing next week, big news"],
      ["you", "why is lp draining"],
      ["dev", "this message was deleted"],
      ["system", "Channel was deleted by owner"],
    ],
  }[kind];

  const title = { explorer: "arc explorer · transaction", wallet: "portfolio · position", chat: "telegram · project chat" }[kind];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600" font-family="ui-monospace, 'SF Mono', Menlo, monospace">
  <rect width="900" height="600" fill="#0b110f"/>
  <rect x="0" y="0" width="900" height="46" fill="#101814"/>
  <circle cx="26" cy="23" r="6" fill="#ff6b7a"/><circle cx="48" cy="23" r="6" fill="#f3bd4f"/><circle cx="70" cy="23" r="6" fill="#49edbf"/>
  <text x="100" y="28" fill="#6f7e76" font-size="15">${esc(title)}</text>
  <text x="40" y="100" fill="#f5f7f6" font-size="26" font-weight="600">${esc(token)}</text>
  <text x="40" y="130" fill="#6f7e76" font-size="15">${esc(addr.slice(0, 34))}…</text>
  ${rows.map((r, i) => `
  <rect x="40" y="${168 + i * 62}" width="820" height="50" rx="8" fill="#101814" stroke="#18231e"/>
  <text x="62" y="${199 + i * 62}" fill="#a8b3ad" font-size="16">${esc(r[0])}</text>
  <text x="838" y="${199 + i * 62}" fill="${String(r[1]).startsWith("-") || String(r[1]).includes("deleted") ? "#ff6b7a" : "#f5f7f6"}" font-size="16" text-anchor="end">${esc(r[1])}</text>`).join("")}
  <text x="40" y="575" fill="#2b3a33" font-size="13">demo evidence · mgm.fund</text>
</svg>`;
}

function writeProof(spec) {
  const name = `demo-${crypto.randomBytes(5).toString("hex")}.svg`;
  const svg = proofSvg(spec);
  fs.writeFileSync(path.join(upDir, name), svg);
  return { path: `/uploads/${name}`, name: `${spec.kind}-${spec.token.toLowerCase()}.png`, size: Buffer.byteLength(svg) };
}

const H = 3600_000;
const DEMO = [
  { p: "Circled Protocol", t: "CRCL", ca: "0x8f3a1c42d7e95b06af21c3d8e740b95127ac60d3", amt: 12400, cat: "rug_pull", st: "reviewing", sup: 148, v: 3120, age: 26 * H, who: "arckid",
    story: "Aped 12.4k into CRCL on launch day. Team ran a 48h marketing blitz, promised a locked LP and a CEX listing by Friday.\n\nOn day three the deploy wallet pulled 94% of liquidity in one tx and the site went 404. LP was never locked — the \"lock\" screenshot they posted was from a different contract entirely.\n\nAttached: my buy tx, the position after the pull, and the chat right before the TG was deleted." },
  { p: "MI Circled", t: "MIC", ca: "0x2b77e0af3c5419d6b8e1074fa9c3d2518e6b74aa", amt: 3200, cat: "dev_dump", st: "verified", sup: 96, v: 1840, age: 50 * H, who: "anon",
    story: "Dev held 18% across four wallets he swore were \"community treasury\". He dumped all four into my bids over nine minutes.\n\nI have the wallet cluster in the screenshots — same funding source, same CEX withdrawal, same block. Lost 3.2k. Not asking for miracles, just want this on the record next to the CA." },
  { p: "AEROCOW", t: "COW", ca: "0x9a3f0b41c2d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4", amt: 840, cat: "honeypot", st: "verified", sup: 61, v: 980, age: 74 * H, who: "cowboy",
    story: "Classic honeypot. Buys go through, sells revert with a generic error. Tested with 10 USDC first, then put in 840 and got locked in.\n\nContract has a hidden whitelist on the transfer function — only three addresses can sell, all funded by the deployer." },
  { p: "Jail Minara", t: "JAIL", ca: "0x4c1d8e05b3a7f962d4e08c17ba53d9e6f2081b7c", amt: 25000, cat: "liquidity_pulled", st: "pending", sup: 34, v: 760, age: 5 * H, who: "whale_sad",
    story: "25k gone in one block. LP pulled at 04:12 UTC, three minutes after the team posted \"we are so back\" in the announcement channel.\n\nThe deployer moved the USDC through two hops into a CEX deposit address. Screens of the tx chain attached. I want this claim sitting on that CA forever." },
  { p: "THE DUKE OF ARC", t: "DUKE", ca: "0x1f2e3d4c5b6a798877665544332211009fee1dcc", amt: 6100, cat: "fake_partnership", st: "rejected", sup: 12, v: 410, age: 120 * H, who: "arcmaxi",
    story: "They announced a partnership with a major payments company and posted a signed \"agreement\". I bought 6.1k on that news. The company denied it publicly the next day and the chart went to zero.\n\nI kept the original announcement and the denial." },
  { p: "Minara CAT", t: "MCAT", ca: "0x7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a", amt: 1500, cat: "bad_team", st: "refunded", sup: 210, v: 5400, age: 200 * H, who: "meowfi",
    story: "Team went silent for two weeks with 40% of the raise unspent. Community pressure got a partial return — I was refunded 1.5k of my position after this claim hit the trending board.\n\nLeaving the case up because it is the only reason it happened." },
  { p: "Girl With A Pearl Earring", t: "PEARL", ca: "0xabcdef0123456789abcdef0123456789abcdef01", amt: 4750, cat: "impersonation", st: "pending", sup: 22, v: 520, age: 9 * H, who: "0xcurator",
    story: "Fake CA pushed by a hacked art account with 200k followers. It was live for 40 minutes and pulled in six figures. I put 4,750 in at the top.\n\nThe real project had not launched a token at all — screenshots show the hacked post and the original team's denial 20 minutes later." },
  { p: "one hundred trillion memes", t: "OHT", ca: "0x5544332211009988776655443322110099887766", amt: 320, cat: "rug_pull", st: "pending", sup: 8, v: 190, age: 2 * H, who: "anon",
    story: "Small bag, 320 bucks, but it is the principle. Dev renounced, then used a hidden mint function to print 40x the supply and sell it into the pool.\n\nMint tx and the supply chart before/after are attached." },
  { p: "Tasklane", t: "TASK", ca: "0x00ff11ee22dd33cc44bb55aa6699778855443322", amt: 9800, cat: "dev_dump", st: "reviewing", sup: 119, v: 2210, age: 40 * H, who: "arcfarmer",
    story: "Seed round at 400k FDV, public at 12M, dev wallet unlocked on day one instead of the advertised 6-month cliff. 9.8k of my money went straight into his exit.\n\nThe vesting contract in the docs was never deployed — screenshots compare the doc address to what is actually on-chain." },
  { p: "Diamond Paws", t: "PAWS", ca: "0x6e5d4c3b2a1908f7e6d5c4b3a2918070f6e5d4c3", amt: 2100, cat: "liquidity_pulled", st: "verified", sup: 88, v: 1490, age: 96 * H, who: "pawsvictim",
    story: "LP was \"burned\" according to their pinned message. The burn tx they linked sent the LP tokens to a wallet they controlled, not to the burn address.\n\nOne character difference in the address. 2.1k lost. Check the screenshots side by side." },
  { p: "Architects", t: "ARCH", ca: "0x778899aabbccddeeff00112233445566778899aa", amt: 560, cat: "other", st: "pending", sup: 5, v: 130, age: 1 * H, who: "anon",
    story: "Paid 560 for a whitelist spot that never existed. The \"official\" mint link in their Discord announcement pointed at a drainer contract.\n\nDiscord post and the drainer approval tx attached. Admin account was compromised for about an hour." },
  { p: "Forging an Era", t: "FORGE", ca: "0xccbbaa99887766554433221100ffeeddccbbaa99", amt: 15400, cat: "bad_team", st: "reviewing", sup: 132, v: 3010, age: 64 * H, who: "longonly",
    story: "Raised on a public roadmap, shipped nothing in five months, then quietly moved the treasury to a new multisig and stopped answering.\n\n15.4k from three buys. I have the treasury movement, the roadmap they deleted, and the last message before they went dark." },
];

const insCase = db.prepare(`INSERT INTO cases
  (id, created_at, updated_at, project_name, ticker, chain, contract, amount_usd, category, story,
   refund_wallet, wallet_address, signature, signed_at, signed_nonce, signed_site, tx_hash, evidence_url,
   contact, reporter, status, admin_note, supports, views, author_hash)
  VALUES (@id, @created, @updated, @p, @t, 'arc', @ca, @amt, @cat, @story,
   @wallet, @wallet, @signature, @signedAt, @nonce, @site, @tx, @url,
   @contact, @who, @st, @note, @sup, @v, @author)`);
const insProof = db.prepare("INSERT INTO proofs (case_id, path, name, size, position) VALUES (?, ?, ?, ?, ?)");

let n = 0;
for (const d of DEMO) {
  const id = `MGM-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const created = Date.now() - d.age;

  // a throwaway wallet that genuinely signs this claim
  const account = privateKeyToAccount(generatePrivateKey());
  const wallet = account.address.toLowerCase();
  const nonce = crypto.randomBytes(16).toString("hex");

  const proofs = ["explorer", "wallet", "chat"]
    .slice(0, 1 + (d.amt > 3000 ? 2 : 1))
    .map((kind) => writeProof({ kind, token: `${d.p} (${d.t})`, amount: d.amt, addr: d.ca, pct: 90 + (d.amt % 9) }));

  const signature = await account.signMessage({
    message: claimMessage({
      address: wallet,
      contract: d.ca.toLowerCase(),
      amountUsd: d.amt,
      proofCount: proofs.length,
      nonce,
      issuedAt: created,
    }),
  });

  db.transaction(() => {
    insCase.run({
      id, created, updated: created + 2 * H, p: d.p, t: d.t, ca: d.ca.toLowerCase(),
      amt: d.amt, cat: d.cat, story: d.story, wallet, signature, signedAt: created, nonce, site: SITE,
      tx: "0x" + crypto.randomBytes(32).toString("hex"),
      url: null, contact: null, who: d.who, st: d.st,
      note: d.st === "rejected" ? "Announcement screenshot could not be matched to the account's post history." : null,
      sup: d.sup, v: d.v, author: "demo-seed",
    });
    proofs.forEach((pr, i) => insProof.run(id, pr.path, pr.name, pr.size, i));
  })();
  n++;
}

console.log(`✓ seeded ${n} signed demo claims into data/mgm.db`);
