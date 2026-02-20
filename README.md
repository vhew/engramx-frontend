# EngramX Frontend

Vue 3 dashboard for [EngramX](https://github.com/vhew/engramx) — a decentralized memory platform on the Internet Computer.

## Tech Stack

- [Vue 3](https://vuejs.org/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) v4
- [Vite](https://vite.dev/) 7
- [ICP SDK](https://github.com/nicoll-douglas/icp-cli) for canister interaction
- PWA support via `vite-plugin-pwa`

## Prerequisites

- [Node.js](https://nodejs.org/) >= 22.12
- [pnpm](https://pnpm.io/)

## Getting Started

```bash
pnpm install
pnpm run dev       # Start dev server
pnpm run build     # Type-check and build for production
pnpm run preview   # Preview production build
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start Vite dev server |
| `pnpm run build` | Type-check (`vue-tsc`) + production build |
| `pnpm run lint` | Lint with ESLint |
| `pnpm run format` | Format with Prettier |

## Pages

| Route | Description |
|-------|-------------|
| Landing | Public landing page with platform metrics |
| Dashboard | Main user dashboard |
| Memory | Memory management |
| Guardian | Guardian status and management |
| Billing | Usage and billing charts |
| System | Canister administration |
| Verify | Verification flow |
| Access | Access control |

## License

[BUSL-1.1](LICENSE)
