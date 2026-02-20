<template>
  <div class="max-w-3xl mx-auto px-4 py-16">
    <h1 class="text-3xl font-bold text-white mb-4">Licensing</h1>
    <p class="text-gray-400 mb-8">
      EngramX is split across multiple repositories, each with its own license.
    </p>

    <div class="overflow-x-auto mb-12">
      <table class="w-full text-sm text-left">
        <thead>
          <tr class="border-b border-gray-800">
            <th class="py-3 pr-4 text-gray-400 font-medium">Component</th>
            <th class="py-3 pr-4 text-gray-400 font-medium">License</th>
            <th class="py-3 text-gray-400 font-medium">Source</th>
          </tr>
        </thead>
        <tbody class="text-gray-300">
          <tr class="border-b border-gray-800/50">
            <td class="py-3 pr-4">Canisters (engram, registry)</td>
            <td class="py-3 pr-4">Apache 2.0</td>
            <td class="py-3">
              <a
                href="https://github.com/vhew/engramx/blob/master/LICENSE"
                class="text-engram-400 hover:text-engram-300 transition-colors"
                >GitHub</a
              >
            </td>
          </tr>
          <tr class="border-b border-gray-800/50">
            <td class="py-3 pr-4">
              Client SDK (<code class="text-xs bg-gray-800 px-1.5 py-0.5 rounded"
                >@engramx/client</code
              >)
            </td>
            <td class="py-3 pr-4">MIT</td>
            <td class="py-3">
              <a
                href="https://github.com/vhew/engramx/blob/master/packages/client/LICENSE"
                class="text-engram-400 hover:text-engram-300 transition-colors"
                >GitHub</a
              >
            </td>
          </tr>
          <tr>
            <td class="py-3 pr-4">Dashboard (engramx.ai)</td>
            <td class="py-3 pr-4">BUSL-1.1 &rarr; MIT (Feb 2030)</td>
            <td class="py-3">
              <a
                href="https://github.com/vhew/engramx-frontend/blob/master/LICENSE"
                class="text-engram-400 hover:text-engram-300 transition-colors"
                >GitHub</a
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <section class="mb-12">
      <h2 class="text-2xl font-bold text-white mb-4">What this means</h2>
      <ul class="space-y-3 text-gray-400">
        <li>
          <strong class="text-gray-300">Canisters &amp; SDK</strong> &mdash; Permissively licensed.
          You can fork, modify, self-host, and build commercial products on top of the EngramX
          platform and client SDK with no restrictions beyond standard attribution.
        </li>
        <li>
          <strong class="text-gray-300">Dashboard</strong> &mdash; Source-available under the
          Business Source License. You can read, modify, and run it for your own use, but you cannot
          offer it as a competing hosted service. On February 19, 2030 the dashboard automatically
          converts to the MIT license.
        </li>
      </ul>
    </section>
  </div>
</template>
