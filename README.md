# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/159aeba2-d647-40b0-a4b1-36ae5d05148c

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/159aeba2-d647-40b0-a4b1-36ae5d05148c) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/159aeba2-d647-40b0-a4b1-36ae5d05148c) and click on Share -> Publish.

## Deploying to GitHub Pages

This repository is pre-configured for GitHub Pages. Follow these steps to publish it:

1. Push your changes to the `main` branch.
2. In GitHub, go to **Settings → Pages** and ensure **Build and deployment** is set to **GitHub Actions** (the default when using the provided workflow).
3. A workflow named **Deploy to GitHub Pages** (`.github/workflows/deploy.yml`) will build the Vite app and publish the `dist` folder to Pages.
4. The workflow automatically sets the correct base path for both classic project pages (`https://github.io/<repo>/`) and user/organization pages (`https://<user>.github.io/`).

### Customization tips

- If you use a custom domain, set `VITE_BASE_PATH=/` as a repository secret or in the Pages workflow to match your root path.
- For deployments outside GitHub Pages, you can override the base path locally by exporting `VITE_BASE_PATH` before running `npm run build`.
