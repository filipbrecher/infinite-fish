# Infinite Fish

Custom frontend for Infinite Craft written in Vanilla TypeScript.

There are multiple ways to run this.

1) Use `npm run dev` which will run on the port 5173 with vite live updating the page when you make changes in the code.
2) Use `npm run build` to build the project into the ./dist directory.
3) Use `npm run monkey` to create a Violentmonkey script ./dist/infinite-fish.user.js which you can then add to Violentmonkey and upon loading https://neal.fun/infinite-craft it is going to replace it with this code.
4) Use `docker compose up` which will expose the built application on the port 8080.
 
# Windows

### Git setup

Install Git Bash "https://git-scm.com/downloads" Standalone Installer for Windows.

Run this in Git Bash in the directory where you want the project to be stored:

```bash
git clone https://github.com/filipbrecher/infinite-fish.git
```

### Run with npm

You need to install npm to be able to run the `npm run dev/build/monkey`.

### Docker build

Install Docker Desktop for Windows "https://docs.docker.com/desktop/setup/install/windows-install/".

To run the application for the first time, you first need to open Docker Desktop, then open Git Bash
(or PowerShell or Command line) and go to the project's root directory and run:

```bash
docker compose up
```

The application will be available at port 8080.

To stop the application from running, you can either press Ctrl+C in the terminal where you started
the application, or stop it in Docker Desktop.

To run the application for the second time (or more), you can just open Docker Desktop and run
the application's container (probably the one with the name "infinite-fish").

### Update to a newer version

To update to a newer version, run

```bash
git pull
```

in the project's directory in Git Bash.

### Issues

If Docker Desktop doesn't load after running it or you have problems, try restarting your computer and running
Docker Desktop as Administrator (right click Docker Desktop in your search bar and "Run as administrator").
