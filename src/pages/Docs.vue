<script setup lang="ts">
import CodeBlock from '../components/CodeBlock.vue';
</script>

<template>
  <div class="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-8 md:py-16">
    <h1 class="text-3xl font-bold text-white mb-4">Documentation</h1>
    <p class="text-gray-400 mb-8">Everything you need to integrate EngramX with your AI agent.</p>

    <!-- Getting Started -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-white mb-4">Getting Started</h2>

      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold text-white mb-2">1. Install the client</h3>
          <CodeBlock code="pnpm add @engramx/client" />
        </div>

        <div>
          <h3 class="text-lg font-semibold text-white mb-2">2. Create an engram</h3>
          <p class="text-gray-400 text-sm mb-2">
            Sign in with Internet Identity on the dashboard, then click "Create Engram". Note your
            engram canister ID.
          </p>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-white mb-2">
            3. Register your host as an operator
          </h3>
          <p class="text-gray-400 text-sm mb-2">
            In the dashboard, go to Access &gt; Operators and click "Create Invite". Copy the
            6-character code.
          </p>
          <CodeBlock code="npx @engramx/client pair <invite-code> --engram <canister-id>" />
          <p class="text-gray-400 text-sm mt-2">
            This generates <code class="text-gray-300">~/.engramx/session.key</code>
          </p>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-white mb-2">4. Use in your agent</h3>
          <CodeBlock
            :code="`import { EngramClient } from '@engramx/client';\n\nconst engram = new EngramClient({\n  canisterId: 'xxxxx-xxxxx-xxxxx-xxxxx-xxx',\n  sessionKeyPath: '~/.engramx/session.key',\n  host: 'https://ic0.app',     // optional, defaults to mainnet\n  cacheMaxAge: 60_000,          // optional, ms\n});\n\nconst file = await engram.readMemory('MEMORY.md');\nawait engram.appendMemory('memory/daily.md', '## Notes\\nSomething happened.');`"
          />
        </div>
      </div>
    </section>

    <!-- API Reference -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-white mb-4">API Reference</h2>

      <div class="space-y-8">
        <div class="card">
          <h3 class="text-lg font-semibold text-white font-mono mb-2">readMemory(path)</h3>
          <p class="text-gray-400 text-sm mb-2">Read a memory file by path. Returns MemoryFile.</p>
          <CodeBlock
            :code="`const file = await engram.readMemory('MEMORY.md');\nconsole.log(file.content);\nconsole.log(file.version); // bigint`"
          />
        </div>

        <div class="card">
          <h3 class="text-lg font-semibold text-white font-mono mb-2">
            appendMemory(path, content)
          </h3>
          <p class="text-gray-400 text-sm mb-2">
            Append content to a memory file. Creates the file if it doesn't exist.
          </p>
          <CodeBlock
            code="const version = await engram.appendMemory('memory/daily.md', '## Today\nLearned about ICP canisters.');"
          />
        </div>

        <div class="card">
          <h3 class="text-lg font-semibold text-white font-mono mb-2">
            searchKeyword(query, topK?)
          </h3>
          <p class="text-gray-400 text-sm mb-2">
            Search memory files by keyword. Returns top-K matching chunks.
          </p>
          <CodeBlock
            :code="`const results = await engram.searchKeyword('authentication', 5);\nresults.forEach(r => console.log(r.path, r.score, r.snippet));`"
          />
        </div>

        <div class="card">
          <h3 class="text-lg font-semibold text-white font-mono mb-2">
            appendSession(sessionKey, messages)
          </h3>
          <p class="text-gray-400 text-sm mb-2">Append messages to a session transcript.</p>
          <CodeBlock
            :code="`await engram.appendSession('session-2026-02-12', [\n  { role: { User: null }, content: 'Hello', timestamp: BigInt(Date.now() * 1_000_000) },\n  { role: { Assistant: null }, content: 'Hi!', timestamp: BigInt(Date.now() * 1_000_000) },\n]);`"
          />
        </div>

        <div class="card">
          <h3 class="text-lg font-semibold text-white font-mono mb-2">walletBalance()</h3>
          <p class="text-gray-400 text-sm mb-2">Get the engram's cycles balance.</p>
          <CodeBlock
            :code="`const balance = await engram.walletBalance();\nconsole.log(\`Balance: \${balance} cycles\`);`"
          />
        </div>

        <div class="card">
          <h3 class="text-lg font-semibold text-white font-mono mb-2">
            readAuditLog(fromIndex?, limit?)
          </h3>
          <p class="text-gray-400 text-sm mb-2">Read audit log entries. Returns AuditEntry[].</p>
          <CodeBlock
            :code="`const entries = await engram.readAuditLog(0, 50);\nentries.forEach(e => console.log(e.operation, e.details, e.success));`"
          />
        </div>
      </div>
    </section>

    <!-- Guardians -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-white mb-4">Guardians</h2>
      <div class="card">
        <p class="text-gray-400 text-sm mb-4">
          Guardians are trusted principals who can take emergency actions on your engram without
          having full owner access. They sit between Owners and Operators in the three-tier security
          model.
        </p>
        <h3 class="font-semibold text-white mb-2">Guardian permissions</h3>
        <ul class="list-disc list-inside space-y-1 text-gray-400 text-sm">
          <li>
            <strong class="text-gray-300">Revoke Operators</strong> &mdash; immediately revoke a
            compromised operator
          </li>
          <li>
            <strong class="text-gray-300">Freeze Payments</strong> &mdash; block all wallet
            transfers
          </li>
          <li>
            <strong class="text-gray-300">Pause Writes</strong> &mdash; block all memory/session
            writes
          </li>
        </ul>
        <p class="text-gray-400 text-sm mt-4">
          Add guardians from the Access &gt; Guardians tab in the dashboard. Only the engram Owner
          can add or remove guardians.
        </p>
      </div>
    </section>

    <!-- Backups -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-white mb-4">Backups</h2>
      <div class="card">
        <p class="text-gray-400 text-sm mb-4">
          EngramX supports chunked backup storage for external databases (SQLite, FalkorDB, LevelDB,
          etc.). Upload snapshots or incremental diffs and restore them on any machine.
        </p>
        <h3 class="font-semibold text-white mb-2">Backup flow</h3>
        <ol class="list-decimal list-inside space-y-1 text-gray-400 text-sm">
          <li>
            Call <code class="text-gray-300">initBackup()</code> with the database type and SHA-256
            hash
          </li>
          <li>Upload data in chunks via <code class="text-gray-300">pushBackupChunk()</code></li>
          <li>Finalize with <code class="text-gray-300">finalizeBackup()</code></li>
          <li>Download later with <code class="text-gray-300">pullBackupChunk()</code></li>
        </ol>
        <p class="text-gray-400 text-sm mt-4">
          Manage backups from the Settings &gt; Backups tab in the dashboard, or use the client SDK
          programmatically.
        </p>
      </div>
    </section>

    <!-- OpenClaw Integration -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-white mb-4">OpenClaw Integration</h2>
      <div class="card">
        <p class="text-gray-400 text-sm mb-4">
          EngramX was originally built for
          <a
            href="https://github.com/nicholasgriffintn/openclaw"
            class="text-engram-400 hover:text-engram-300"
            >OpenClaw</a
          >, an open-source AI agent platform. If you're using OpenClaw, the integration is a single
          config change:
        </p>
        <CodeBlock
          :code="`// openclaw.json\n{\n  &quot;engram&quot;: {\n    &quot;canisterId&quot;: &quot;xxxxx-xxxxx-xxxxx-xxxxx-xxx&quot;,\n    &quot;sessionKeyPath&quot;: &quot;~/.engramx/session.key&quot;\n  }\n}`"
          language="json"
        />
        <p class="text-gray-400 text-sm mt-4">
          OpenClaw users migrating from <code class="text-gray-300">~/.openclaw/</code> local
          storage: EngramX replaces the filesystem-based memory layer entirely. Your agent's memory,
          identity, and conversation history move into an ICP canister where they survive host
          failure and can be verified by anyone.
        </p>
      </div>
    </section>

    <!-- If Compromised -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-white mb-4">If Your Machine Is Compromised</h2>
      <div class="card">
        <ol class="list-decimal list-inside space-y-3 text-gray-300 text-sm">
          <li>Open the dashboard on your phone</li>
          <li>Sign in with Internet Identity</li>
          <li>
            Go to Access &gt; Operators &rarr; find the compromised host &rarr;
            <strong class="text-red-400">Revoke</strong>
          </li>
          <li>Review the Audit Log (Settings &gt; Audit Log) for suspicious activity</li>
          <li>Rollback any poisoned memory files from Memory &gt; Files</li>
          <li>
            On a clean machine: install your agent framework, register a new operator, pair, resume
          </li>
        </ol>
      </div>
    </section>

    <!-- Roadmap -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold text-white mb-4">Roadmap</h2>
      <div class="space-y-4">
        <div class="card">
          <h3 class="font-semibold text-white mb-1">ERC-8004 Agent Identity</h3>
          <p class="text-gray-400 text-sm">
            Threshold ECDSA-derived Ethereum address for on-chain agent identity. Currently stubbed
            &mdash; <code class="text-gray-300">initAgentIdentity()</code> and
            <code class="text-gray-300">signWithAgentKey()</code> are available but signing is not
            yet implemented.
          </p>
        </div>
        <div class="card">
          <h3 class="font-semibold text-white mb-1">x402 Payment Protocol</h3>
          <p class="text-gray-400 text-sm">
            Autonomous payments via the x402 HTTP payment protocol.
            <code class="text-gray-300">createPaymentAuthorization()</code> is stubbed and ready for
            integration.
          </p>
        </div>
        <div class="card">
          <h3 class="font-semibold text-white mb-1">World ID Verification</h3>
          <p class="text-gray-400 text-sm">
            Proof-of-personhood for engram owners via World ID.
            <code class="text-gray-300">setWorldIdProof()</code> /
            <code class="text-gray-300">getWorldIdProof()</code>
            are available but verification is not yet on-chain.
          </p>
        </div>
      </div>
    </section>

    <!-- Troubleshooting -->
    <section>
      <h2 class="text-2xl font-bold text-white mb-4">Troubleshooting</h2>
      <div class="space-y-4">
        <div class="card">
          <h3 class="font-semibold text-white mb-1">"Not authorized" error</h3>
          <p class="text-gray-400 text-sm">
            Your session key is not registered as an operator, or has been revoked. Create a new
            invite and re-pair.
          </p>
        </div>
        <div class="card">
          <h3 class="font-semibold text-white mb-1">"Rate limit exceeded" error</h3>
          <p class="text-gray-400 text-sm">
            You've exceeded the operator's per-minute call limit (default: 120/min). Wait a minute
            and retry, or ask the owner to increase the limit.
          </p>
        </div>
        <div class="card">
          <h3 class="font-semibold text-white mb-1">
            "Identity files can only be modified by owner"
          </h3>
          <p class="text-gray-400 text-sm">
            SOUL.md, USER.md, and AGENTS.md are protected. Only the engram owner can modify them
            through the dashboard.
          </p>
        </div>
        <div class="card">
          <h3 class="font-semibold text-white mb-1">Canister running low on cycles</h3>
          <p class="text-gray-400 text-sm">
            Top up your engram with cycles using
            <code class="text-gray-300"
              >icp cycles transfer &lt;amount&gt; &lt;canister-id&gt; -e ic</code
            >
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
