# ACT Therapy App

This is an interactive Acceptance and Commitment Therapy (ACT) application that helps users explore ACT principles through a guided conversational interface. The app uses AI to provide personalized therapy-inspired conversations based on ACT methodology.

## About ACT Therapy App

### What is ACT?

Acceptance and Commitment Therapy (ACT) is a form of psychotherapy that helps people accept difficult thoughts and feelings while taking value-driven actions toward a meaningful life. ACT focuses on:

- Psychological flexibility
- Mindfulness
- Value-based living
- Acceptance of difficult emotions
- Defusion from unhelpful thoughts
- Committed action

### How the App Works

The ACT Therapy App provides a user-friendly interface where users can:

1. **Explore ACT Themes**: Choose from key ACT concepts like Values, Defusion, Mindfulness, Acceptance, Self, Commitment, and Compassion
2. **Practice Exercises**: Engage with specific exercises and techniques within each theme
3. **Conversational Interface**: Interact via chat with an AI assistant that guides the therapeutic journey
4. **Keyword Exploration**: Dive deeper into concepts using the keyword panel that shows key terms from each response
5. **Dark/Light Modes**: Switch between visual themes for comfort
6. **Guided Tour**: Step through an interactive tutorial that explains app features

### Technical Features

- Vue 3 with TypeScript for robust frontend development
- Google's Gemini AI API integration for intelligent responses
- Tailwind CSS for responsive, modern UI
- Font Awesome integration for intuitive iconography
- Keyboard shortcuts (ESC, Enter) for enhanced navigation
- Responsive design for various device sizes

## Next Steps for Development

### Short-term Improvements

1. **Offline Mode**: Implement basic functionality that works without internet connection
2. **Session History**: Add the ability to save and review past therapy sessions
3. **Export Functionality**: Allow users to export insights and conversations
4. **Accessibility Enhancements**: Improve screen reader support and keyboard navigation
5. **Multi-language Support**: Add additional languages beyond Dutch

### Medium-term Features

1. **User Accounts**: Optional accounts for preserving progress across devices
2. **Personalized Journeys**: Tailored paths based on user's therapeutic goals
3. **Progress Tracking**: Visual representation of engagement and practice
4. **Reminder System**: Optional notifications for consistent practice
5. **Expanded Exercise Library**: More interactive ACT exercises with multimedia elements

### Long-term Vision

1. **Mobile Applications**: Native iOS and Android versions
2. **Professional Integration**: Features for therapists to recommend and track client usage
3. **Research Collaboration**: Anonymous data collection (opt-in) for ACT effectiveness research
4. **Community Features**: Optional peer support and shared experiences
5. **Integration with Wearables**: Use data from health devices to suggest appropriate exercises

## Getting Started with Development

### Installation

```bash
git clone [repository-url]
cd act-therapy-app
npm install  # or pnpm install
```

### Development

```bash
npm run dev  # or pnpm dev
```

Visit http://localhost:5173 (or the port shown in your console)

### Build for Production

```bash
npm run build  # or pnpm build
```

## Contributing

Contributions to the ACT Therapy App are welcome! Please feel free to submit pull requests or open issues to improve the application.

## Technical Details

This app is built with the following technologies:

- [Vue 3](https://github.com/vuejs/core)
- [Vite](https://github.com/vitejs/vite)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com)
- [Font Awesome](https://fontawesome.com/) for icons
- [Google Gemini API](https://ai.google.dev/) for AI capabilities

## License

This source code is available under the [MIT License](/LICENSE).

# TypeScript + Vite + Vue 3 + Tailwind

This template should help get you started developing with Vue 3, TailwindCSS and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## Features

- [Vue 3](https://github.com/vuejs/core), [Vite 3](https://github.com/vitejs/vite), [pnpm](https://pnpm.io/), [ESBuild](https://github.com/evanw/esbuild)
- [Nano Store](https://github.com/nanostores/nanostores)
- [Tailwind CSS](https://tailwindcss.com) + [Light/Dark mode](./src/components/ThemeSwitcher.vue)
- Library and Vue Component auto importing
- Page Speed Optimized.
- SEO.
- Deploy on [Netlify](https://netlify.com), [Vercel](https://vercel.com) zero-config.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar).

## Type Support For `.vue` Imports in TS

Since TypeScript cannot handle type information for `.vue` imports, they are shimmed to be a generic Vue component type by default. In most cases, this is fine if you don't really care about component prop types outside of templates. However, if you wish to get actual prop types in `.vue` imports (for example to get props validation when using manual `h(...)` calls), you can enable Volar's Take Over mode by following these steps:

1. Run `Extensions: Show Built-in Extensions` from VS Code's command palette, look for `TypeScript and JavaScript Language Features`, then right-click and select `Disable (Workspace)`. By default, Take Over mode will enable itself if the default TypeScript extension is disabled.
2. Reload the VS Code window by running `Developer: Reload Window` from the command palette.

You can learn more about Take Over mode [here](https://github.com/johnsoncodehk/volar/discussions/471).

## Try it now!

> This source code requires Node >=14.18

### Clone to local

If you prefer to do it manually with the cleaner git history

```bash
git clone git@github.com:ansidev/template-vite-vue-tailwind.git my-app
cd my-app
pnpm i # If you don't have pnpm installed, run: npm install -g pnpm
```

## Usage

### Development

Just run and visit http://localhost:5173

```bash
pnpm dev
```

### Build

To build the App, run

```bash
pnpm build
```

And you will see the generated file in `dist` that is ready to be served.

### Deploy on Netlify

Go to [Netlify](https://app.netlify.com/start) and select your clone, `OK` along the way, and your app will be live in a minute.

### Deploy on Vercel

Go to [Vercel](https://vercel.com/dashboard) and click `Add new` -> `Project`. Then, select your clone, `OK` along the way, and your app will be live in a minute.

## Contact

Le Minh Tri [@ansidev](https://ansidev.xyz/about).

## Sessiedata Migratie: Van localStorage naar Supabase

### Overzicht

Dit document beschrijft de implementatie van Supabase voor gebruikerssessies terwijl de lokale opslag wordt behouden voor anonieme gebruikers.

### Belangrijkste wijzigingen

1. **Dual Storage Strategy**: 
   - Ingelogde gebruikers: Sessies worden opgeslagen in Supabase
   - Anonieme gebruikers: Sessies worden opgeslagen in localStorage

2. **Aangepaste datastructuur**:
   - Sessions tabel: ID, gebruiker ID, titel, datum, duur, inzichten, en samenvatting
   - Messages tabel: Sessie ID, role (user/assistant), content, en timestamp

3. **Belangrijkste functies**:
   - `saveCurrentSession`: Controleert of de gebruiker is ingelogd en slaat de sessie op in Supabase of localStorage
   - `loadSavedSessions`: Laadt sessies van Supabase voor ingelogde gebruikers of van localStorage voor anonieme gebruikers
   - `loadSession`: Laadt een specifieke sessie van de juiste bron
   - `deleteSession`: Verwijdert een sessie en alle gekoppelde berichten

### SQL Schema

```sql
-- Sessions tabel
create table sessions (
  id text primary key,
  user_id uuid references auth.users,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  duration integer default 0,
  insights text[] default '{}',
  summary jsonb,
  is_archived boolean default false
);

-- Messages tabel
create table messages (
  id uuid default uuid_generate_v4() primary key,
  session_id text references sessions on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text,
  essence text,
  timestamp timestamp with time zone default timezone('utc'::text, now())
);
```

### Fallback Mechanisme

We hebben een fallback mechanisme geïmplementeerd:

1. Als het opslaan in Supabase mislukt, proberen we het alsnog in localStorage op te slaan
2. Als het laden uit Supabase mislukt, proberen we te laden vanuit localStorage
3. Bij het inloggen worden anonieme sessies uit localStorage automatisch gemigreerd naar Supabase

### Toekomstige verbeteringen

1. Implementeer synchronisatie van sessies tussen apparaten
2. Voeg versiebeheer toe aan sessies
3. Implementeer offline-first voor verbeterde betrouwbaarheid
4. Voeg encryptie toe voor gevoelige sessie-informatie

## Werken met dit project

### Vereisten
- Node.js 18 of hoger
- Een Supabase account en project
- Google Gemini API key

### Installatie

1. Clone de repository
2. Installeer afhankelijkheden met `npm install`
3. Kopieer `.env.example` naar `.env` en vul de benodigde API sleutels in
4. Voer het SQL schema uit in je Supabase project
5. Start de ontwikkelserver met `npm run dev`
