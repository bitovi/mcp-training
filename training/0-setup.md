
# MCP Training Setup Guide

## Introduction

This guide will help you set up your development environment for building Model Context Protocol (MCP) servers using Node.js and TypeScript. By the end of this setup, you'll have everything needed to follow the hands-on training steps.

## Setup Options

Choose one of the following setup methods:

### Option A: Dev Container (Recommended) 🚀

**Simplest setup** - One-click development environment with everything pre-configured.

**Prerequisites:**
- **Docker** installed and running
  - Download: [docker.com/get-started](https://www.docker.com/get-started/)
  - Ensure Docker Desktop is running before proceeding
- **Visual Studio Code** with the **Dev Containers extension**
  - VS Code: [code.visualstudio.com](https://code.visualstudio.com/)
  - Dev Containers extension: [marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

**Steps:**
1. **Clone the repository**:
   ```bash
   git clone https://github.com/bitovi/mcp-training.git
   cd mcp-training
   ```

2. **Open in VS Code**:
   ```bash
   code .
   ```

3. **Reopen in Container**:
   - VS Code will detect the dev container configuration
   - Click "Reopen in Container" when prompted
   - Or use Command Palette (`Ctrl+Shift+P`): "Dev Containers: Reopen in Container"

4. **Wait for setup to complete** - The container will automatically:
   - Install Node.js 20
   - Install all dependencies (`npm install`)
   - Make server files executable
   - Configure VS Code extensions
   - Set up port forwarding for MCP servers

5. **Verify setup**:
   ```bash
   npm run dev:stdio  # Test stdio server
   npm run dev:http   # Test HTTP server
   ```

**Benefits of dev container:**
- ✅ Consistent environment across all platforms
- ✅ Pre-configured VS Code extensions
- ✅ Automatic port forwarding (3000, 6274, 6277)
- ✅ No manual dependency installation
- ✅ Isolated from your host system

---

### Option B: Manual Installation

**Full control** - Install everything directly on your system.

## Prerequisites

Before starting, ensure you have the following installed on your system:

### Required Software

1. **Node.js (version 18 or higher)**
2. **Git** 
3. **Visual Studio Code**
4. **A terminal/command prompt**

## Installation Instructions

### 1. Install Node.js

**Check if Node.js is already installed:**
```bash
node --version
```

If you see a version number 18.0.0 or higher, you can skip to step 2.

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

### 2. Install Git

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

### 3. Install Visual Studio Code

**Download and install:**
- Go to [code.visualstudio.com](https://code.visualstudio.com/)
- Download the installer for your operating system
- Follow the installation instructions

**Recommended VS Code Extensions:**
- **TypeScript and JavaScript Language Features** (usually pre-installed)
- **ESLint** - for code linting
- **Prettier** - for code formatting
- **GitLens** - enhanced Git integration

Install extensions by opening VS Code and pressing `Ctrl+Shift+X` (or `Cmd+Shift+X` on macOS), then search for each extension name.

## Project Setup

### 1. Clone the Training Repository

Open your terminal/command prompt and run:

```bash
git clone https://github.com/bitovi/mcp-training.git
cd mcp-training
```

### 2. Install Dependencies

Install the project dependencies using npm:

```bash
npm install
```

### 3. Make Server Files Executable

The training includes server files that need to be executable to run directly. Make them executable with these commands:

**For macOS/Linux:**
```bash
chmod +x src/stdio-server.ts
chmod +x src/http-server.ts
```

**For Windows:**
No additional steps needed - Windows doesn't use the executable permission system.

**Verify the setup by testing the servers:**

**Test stdio server:**
```bash
npm run dev:stdio
```

You should see output indicating the server is running. Press `Ctrl+C` to stop it.

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


## Next Steps

Once your setup is complete (either dev container or manual):

1. **Verify everything works** by running the test commands
2. **Open the project in VS Code** (if not already open)
3. **Start with Step 1**: Read `training/1-what-is-mcp.md`
4. **Follow the training progression** through each numbered step

## Getting Help

If you encounter issues:

**For Dev Container users:**
1. **Ensure Docker is running** and you have the Dev Containers extension
2. **Try rebuilding the container**: Command Palette → "Dev Containers: Rebuild Container"
3. **Check Docker logs** if the container fails to start

**For Manual Installation users:**
1. **Check the troubleshooting section** above
2. **Verify your Node.js version**: `node --version` (should be 18+)
3. **Try deleting `node_modules` and reinstalling**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

**For Both setups:**
4. **Check the GitHub Issues** on the training repository
5. **Ask for help** in your training session or workshop

## Summary

After completing either setup option, you should have:

### Dev Container Users:
✅ Docker container with Node.js 20 ready  
✅ All dependencies pre-installed  
✅ VS Code extensions configured automatically  
✅ Port forwarding set up (3000, 6274, 6277)  
✅ Server files executable  
✅ Consistent environment across platforms  

### Manual Installation Users:
✅ Node.js 18+ installed and working  
✅ Git installed and working  
✅ VS Code installed with recommended extensions  
✅ Training repository cloned  
✅ Dependencies installed manually  
✅ Server files made executable (macOS/Linux)  

**Both setups provide:**
✅ Both stdio and HTTP servers running successfully  
✅ MCP Inspector available for testing  
✅ Ready to begin the MCP training journey! 🚀