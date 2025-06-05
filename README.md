# Infinite Fish

Custom frontend for Infinite Craft written in Vanilla TypeScript.


# Linux

You need to download docker.

Then run in bash like this with docker:

```bash
docker compose up
```

The application will be available at `http://localhost:8080`.

Or with npm (for live updates):

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

# Windows

Install Git Bash "https://git-scm.com/downloads" Standalone Installer for Windows.

Install Docker Desktop for Windows "https://docs.docker.com/desktop/setup/install/windows-install/".

Run this in Git Bash in the directory where you want the project to be stored:

```bash
git clone https://github.com/filipbrecher/infinite-fish.git
```
To run the application for the first time, you first need to open Docker Desktop, then open Git Bash (or PowerShell or Command line) and go to the project's root directory and run:

```bash
docker compose up
```

The application will be available at `http://localhost:8080`.

To stop the application from running, you can either press Ctrl+C in the terminal where you started the application, or stop it in Docker Desktop.

To run the application for the second time (or more), you can just open Docker Desktop and run the application's container (probably the one with the name "infinite-fish").

Alternately you can also run the application from a terminal using

```bash
npm run dev
```
but you need to install npm for that. Then the application will be available at `http://localhost:5173`.

### Update to a newer version

To update to a newer version, run

```bash
git pull
```

in the project's directory in Git Bash.

### Issues

If Docker Desktop doesn't load after running it or you have problems, try restarting your computer and running Docker Desktop as Administrator (right click Docker Desktop in your search bar and "Run as administrator").