# MCP Training Setup Guide

This guide will help you set up your development environment for building Model Context Protocol (MCP) servers using Node.js and TypeScript. By the end of this setup, you'll have everything needed to follow the hands-on training steps.

Make sure you have VSCode setup, then continue either DevContainer Setup (recommended) or Local Setup below.

- [Setup Visual Studio Code](#setup-visual-studio-code)
- [Setup Dev Environment](#setup-dev-environment)
  - [DevContainer Setup (recommended)](#devcontainer-setup)
  - [Local Setup (alternative)](#local-setup)
- [Verifying Setup](#verifying-setup)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

### Setup Visual Studio Code

**Download and install, if needed:**

- Go to [code.visualstudio.com](https://code.visualstudio.com/)
- Download the installer for your operating system
- Follow the installation instructions

**Required VS Code Extension for DevContainer Setup:**

- **Dev Containers** - [marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

**Recommended VS Code Extensions:**

VS Code should automatically suggest installing these extensions when you open this workspace. You can agree to the popop suggestion or install yourself:

- **TypeScript and JavaScript Language Features** (usually pre-installed)
- **ESLint** - for code linting
- **Prettier** - for code formatting
- **GitLens** - enhanced Git integration

Install extensions by opening VS Code and pressing `Ctrl+Shift+X` (or `Cmd+Shift+X` on macOS), then search for each extension name.

## Setup Dev Environment

After VSCode is setup, follow the instructions for either the DevContainer Setup (recommended) or the Local Setup. [Troubleshooting steps](#troubleshooting) are at the bottom of this page.

### DevContainer Setup

**Simplest setup** - One-click development environment with everything pre-configured.

**Prerequisites:**

- **Docker** installed and running
  - Download: [docker.com/get-started](https://www.docker.com/get-started/)
  - Ensure Docker Desktop is running before proceeding
- **Visual Studio Code** with the **Dev Containers extension** - see [Setup Visual Studio Code](#setup-visual-studio-code)

**Steps:**

1. **Clone the repository using VS Code**:

   - Open VS Code
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) to open Command Palette
   - Type "Git: Clone" and select it
   - Enter repository URL: `https://github.com/bitovi/mcp-training.git`
   - Choose a folder location when prompted
   - Click "Open" when VS Code asks to open the cloned repository

2. **Reopen in Container**:

   - VS Code will detect the dev container configuration
   - Click "Reopen in Container" when prompted
   - Or use Command Palette (`Ctrl+Shift+P`): "Dev Containers: Reopen in Container"

3. **Wait for setup to complete** - The container will automatically:
   - Install Node.js 20
   - Install all dependencies (`npm install`)
   - Make server files executable
   - Configure VS Code extensions
   - Set up port forwarding for MCP servers
   <!-- todo: discuss: how does a learner verify these are setup correctly? -->

**Benefits of dev container:**

- ✅ Consistent environment across all platforms
- ✅ Pre-configured VS Code extensions
- ✅ Automatic port forwarding (3000, 6274, 6277)
- ✅ No manual dependency installation
- ✅ Isolated from your host system

### Local Setup

**Full control** - Install everything directly on your system.

#### **Prerequisites:**

- [Node.js (version 18 or higher)](#install-nodejs)
- [Git](#install-git)
- [Visual Studio Code](#setup-visual-studio-code)
- A terminal/command prompt

##### Install Node.js

**Check if Node.js is already installed:**

```bash
node --version
```

If you see a version number 18.0.0 or higher, you can skip this step.

**Install Node.js:**

**Windows:**

- Download the Windows installer from [nodejs.org](https://nodejs.org/)
- Run the installer and follow the prompts
- Restart your terminal/command prompt

**macOS:**

- Download the macOS installer from [nodejs.org](https://nodejs.org/)
- Run the installer and follow the prompts
- Or use Homebrew: `brew install node`

**Linux (Ubuntu/Debian):**

```bash
# Update package list
sudo apt update

# Install Node.js and npm
sudo apt install nodejs npm

# For the latest version, use NodeSource repository:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Linux (CentOS/RHEL/Fedora):**

```bash
# Using dnf (Fedora)
sudo dnf install nodejs npm

# Using yum (CentOS/RHEL)
sudo yum install nodejs npm
```

**Verify installation:**

```bash
node --version
npm --version
```

You should see Node.js version 18+ and npm version 8+.

##### Install Git

**Check if Git is already installed:**

```bash
git --version
```

**Install Git if needed:**

**Windows:**

- Download Git from [git-scm.com](https://git-scm.com/download/win)
- Run the installer with default settings

**macOS:**

- Git comes pre-installed with Xcode Command Line Tools
- If not installed: `xcode-select --install`
- Or use Homebrew: `brew install git`

**Linux:**

```bash
# Ubuntu/Debian
sudo apt install git

# CentOS/RHEL/Fedora
sudo dnf install git
# or
sudo yum install git
```

#### **Steps:**

1. **Clone the repository**:
   <!-- todo: minor discussion: these "clone" instructions should match the "clone" instructions in the DevContainer setup. There, it clones from inside VSCode terminal with different commands, this assumes use of a generic terminal. Maybe use the instructions for inside vscode, so there's no one fighting with `code .` not working? Those these are simpler and what most devs would do 🤷 -->

   ```bash
   git clone https://github.com/bitovi/mcp-training.git
   cd mcp-training
   ```

   Then open the folder in VS Code: `code .`

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Make server files executable** (macOS/Linux only):
   ```bash
   chmod +x src/stdio-server.ts
   chmod +x src/http-server.ts
   ```

## Verifying Setup

After completing either setup method, test that everything is working:

**Test stdio server:**

```bash
npm run dev:stdio
```

The command should run and exit without error (no output is expected - this is normal).

**Test HTTP server:**

```bash
npm run dev:http
```

You should see:

```
🚀 MCP HTTP Server starting on http://localhost:3000
📡 MCP endpoint: http://localhost:3000/mcp
```

Press `Ctrl+C` to stop the server.

**🎉 If both commands ran successfully, you have completed setup!**

Behind the scenes, your successful test means you now have:

### DevContainer Users:

✅ Docker container with Node.js 20 ready  
✅ All dependencies pre-installed  
✅ VS Code extensions configured automatically  
✅ Port forwarding set up (3000, 6274, 6277)  
✅ Server files executable  
✅ Both stdio and HTTP servers running successfully

### Local Setup Users:

✅ Node.js 18+ installed and working  
✅ Git installed and working  
✅ VS Code installed with recommended extensions  
✅ Training repository cloned  
✅ Dependencies installed  
✅ Server files made executable (macOS/Linux)  
✅ Both stdio and HTTP servers running successfully

## Troubleshooting

### Node.js Version Issues

If you have an older version of Node.js:

**Using Node Version Manager (recommended):**

**Install nvm (macOS/Linux):**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# Restart terminal, then:
nvm install 20
nvm use 20
```

**Install nvm for Windows:**

- Download nvm-windows from [github.com/coreybutler/nvm-windows](https://github.com/coreybutler/nvm-windows)
- Install and restart terminal
- Run: `nvm install 20.0.0` and `nvm use 20.0.0`

### Permission Issues (Linux/macOS)

If you get permission errors with npm:

```bash
# Create a directory for global packages
mkdir ~/.npm-global

# Configure npm to use the new directory
npm config set prefix '~/.npm-global'

# Add to your ~/.bashrc or ~/.zshrc:
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Windows Path Issues

If commands like `npm` or `node` are not found:

1. Search for "Environment Variables" in Windows
2. Add Node.js installation path to your PATH environment variable
3. Restart your terminal/command prompt

### DevContainer Issues

**For DevContainer users:**

1. **Ensure Docker is running** and you have the Dev Containers extension
2. **Try rebuilding the container**: Command Palette → "Dev Containers: Rebuild Container"
3. **Check Docker logs** if the container fails to start
4. **If Docker Desktop is recently installed and running, but VS Code says the Docker version number is wrong and prompts to install Docker again**: the /usr/local/bin paths may have not been installed correctly, & not because of any user error. This is an rare Mac-specific problem.
   1. **Check Docker version** by running `docker --version` in a terminal. This is not the same as the Docker Desktop version.
      - If the version is lower than what VS Code is requesting, update/install Docker, then return to [DevContainer Setup](#devcontainer-setup) above.
      - If it says `docker: command not found`, continue through the next steps. Re-installing Docker is unlikely to fix it.
   2. **Check if Docker paths were all installed correctly.** Find all Docker paths in `/usr/local/bin` by running this in a new (not VS Code) root terminal:
      ```bash
      ls -l /usr/local/bin | grep docker
      ```
      - Output should show multiple lines of files found, and must have one that is just for `docker` like this: `<...> docker -> /Applications/Docker.app/Contents/Resources/bin/docker`. We are specifically looking for `docker`, not just `docker-compose`.
        - For context: if there is no `docker` in the output, this explains why `docker --version` results in a `command not found`, in spite of Docker Desktop being installed. The correct paths are missing.
   3. **If `docker` is missing, force-add it** by doing the following:
      1. Inside Docker Desktop, click the topbar's gear icon to **open "Settings"**
      2. Click **"Advanced"** from the sidebar menu.
      3. Toggle the choices under **"configure the installation of Docker's CLI tools"** back and forth:
         - Choose "User", then "Apply". After it finishes, restart Docker.
         - Choose "System", then "Apply". After it finishes restart Docker.
         - Open a new terminal, and run `ls -l /usr/local/bin | grep docker` again. It should now show a list of files including `docker`. If so, restart VS Code and continue with [DevContainer Setup](#devcontainer-setup).

### Local Installation Issues

**For Local Setup users:**

1. **Verify your Node.js version**: `node --version` (should be 18+)
2. **Try deleting `node_modules` and reinstalling**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
3. **Check the GitHub Issues** on the training repository for known problems

## Next Steps

Once your setup is complete and verified, you're ready to start learning MCP!

**Continue to:** [Step 1 - What is MCP?](1-what-is-mcp.md)

This will introduce you to the Model Context Protocol fundamentals before we dive into hands-on development. The training progression will take you from basic concepts to building production-ready MCP servers.

Ready to begin your MCP training journey! 🚀
