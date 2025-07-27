#!/usr/bin/env python3
"""
Deployment script for StreetSource React+Vite+TypeScript frontend and Rust backend to EC2
Usage: python deploy_script.py --identity-file /path/to/key.pem --host ubuntu@your-ec2-ip
"""

import argparse
import subprocess
import sys
import os
import logging
import platform
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DeploymentError(Exception):
    """Custom exception for deployment errors"""
    pass

class Deployer:
    def __init__(self, identity_file: str, host: str, backend_port: int = 3000):
        self.identity_file = identity_file
        self.host = host
        self.backend_port = backend_port
        self.project_root = Path(__file__).parent
        self.frontend_dir = self.project_root / "frontend"
        self.backend_dir = self.project_root / "backend"
        self.is_windows = platform.system() == "Windows"
        self.is_wsl = self.check_wsl()
        
        # Ubuntu target for cross-compilation (only needed if not in WSL/Linux)
        self.rust_target = "x86_64-unknown-linux-gnu"
        
        # Remote paths
        self.remote_app_dir = "/opt/streetsource"
        self.remote_frontend_dir = f"{self.remote_app_dir}/frontend"
        self.remote_backend_dir = f"{self.remote_app_dir}/backend"
        
    def check_wsl(self):
        """Check if running inside WSL"""
        try:
            with open('/proc/version', 'r') as f:
                return 'microsoft' in f.read().lower() or 'wsl' in f.read().lower()
        except:
            return False
        
    def run_command(self, command: list, cwd: Path = None, capture_output: bool = False, shell: bool = None):
        """Run a command and handle errors"""
        if shell is None:
            shell = self.is_windows
            
        try:
            logger.info(f"Running: {' '.join(command)}")
            result = subprocess.run(
                command, 
                cwd=cwd or self.project_root,
                check=True,
                capture_output=capture_output,
                text=True,
                shell=shell
            )
            if capture_output:
                return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            logger.error(f"Command failed: {' '.join(command)}")
            logger.error(f"Error: {e}")
            raise DeploymentError(f"Command failed: {e}")
    
    def ssh_command(self, command: str, capture_output: bool = False):
        """Execute command on remote server via SSH"""
        ssh_cmd = [
            "ssh", 
            "-i", self.identity_file,
            "-o", "StrictHostKeyChecking=no",
            self.host,
            command
        ]
        return self.run_command(ssh_cmd, capture_output=capture_output, shell=False)
    
    def scp_copy(self, local_path: str, remote_path: str, recursive: bool = False):
        """Copy files to remote server via SCP"""
        scp_cmd = ["scp", "-i", self.identity_file, "-o", "StrictHostKeyChecking=no"]
        if recursive:
            scp_cmd.append("-r")
        scp_cmd.extend([local_path, f"{self.host}:{remote_path}"])
        self.run_command(scp_cmd, shell=False)
    
    def validate_environment(self):
        """Validate local environment and dependencies"""
        logger.info("Validating local environment...")
        
        # Check if directories exist
        if not self.frontend_dir.exists():
            raise DeploymentError(f"Frontend directory not found: {self.frontend_dir}")
        if not self.backend_dir.exists():
            raise DeploymentError(f"Backend directory not found: {self.backend_dir}")
        
        # Check if identity file exists
        if not Path(self.identity_file).exists():
            raise DeploymentError(f"Identity file not found: {self.identity_file}")
        
        # Different tools needed based on environment
        if self.is_wsl or not self.is_windows:
            # Running in WSL or Linux - use native cargo
            required_tools = ["node", "npm", "cargo"]
            logger.info("Detected WSL/Linux environment - using native cargo build")
            
            # Check for essential build dependencies in WSL/Linux
            self.check_wsl_dependencies()
        else:
            # Running on Windows - need cross tool
            required_tools = ["node", "npm", "cross"]
            logger.info("Detected Windows environment - using cross tool")
        
        for tool in required_tools:
            try:
                if self.is_windows and not self.is_wsl:
                    self.run_command(["where", tool], capture_output=True)
                else:
                    self.run_command(["which", tool], capture_output=True)
            except DeploymentError:
                if tool == "cross":
                    raise DeploymentError(f"Cross tool not found. Install it with: cargo install cross")
                else:
                    raise DeploymentError(f"Required tool not found: {tool}")
        
        # Check for SSH tools
        ssh_tools = ["ssh", "scp"]
        for tool in ssh_tools:
            try:
                if self.is_windows and not self.is_wsl:
                    # Try Windows built-in SSH first, then Git Bash
                    try:
                        self.run_command(["where", tool], capture_output=True)
                    except DeploymentError:
                        # Try Git Bash location
                        git_bash_path = Path("C:/Program Files/Git/usr/bin") / f"{tool}.exe"
                        if not git_bash_path.exists():
                            raise DeploymentError(f"SSH tool not found: {tool}. Please install Git for Windows or enable OpenSSH.")
                else:
                    self.run_command(["which", tool], capture_output=True)
            except DeploymentError:
                raise DeploymentError(f"SSH tool not found: {tool}")
        
        # Environment-specific validation
        if self.is_windows and not self.is_wsl:
            # Verify Docker is running (required for cross)
            try:
                self.run_command(["docker", "info"], capture_output=True)
            except DeploymentError:
                raise DeploymentError("Docker is not running. Cross requires Docker to be running for cross-compilation.")
        
        logger.info("Local environment validation passed")
    
    def check_wsl_dependencies(self):
        """Check and install essential build dependencies in WSL/Linux"""
        logger.info("Checking WSL/Linux build dependencies...")
        
        # Check if build-essential is installed
        try:
            self.run_command(["dpkg", "-l", "build-essential"], capture_output=True)
        except DeploymentError:
            logger.warning("build-essential not found. Installing build dependencies...")
            try:
                self.run_command(["sudo", "apt", "update"])
                self.run_command(["sudo", "apt", "install", "-y", "build-essential", "pkg-config", "libssl-dev"])
                logger.info("Build dependencies installed successfully")
            except DeploymentError:
                logger.error("Failed to install build dependencies automatically.")
                logger.error("Please run manually: sudo apt update && sudo apt install -y build-essential pkg-config libssl-dev")
                raise DeploymentError("Missing build dependencies")
    
    def setup_native_build_config(self):
        """Ensure native linking is used in WSL/Linux"""
        if not (self.is_wsl or not self.is_windows):
            return
            
        logger.info("Setting up native build configuration for WSL/Linux...")
        
        cargo_dir = self.backend_dir / ".cargo"
        cargo_config_path = cargo_dir / "config.toml"
        
        # Create .cargo directory if it doesn't exist
        cargo_dir.mkdir(exist_ok=True)
        
        # Read existing config
        config_content = ""
        if cargo_config_path.exists():
            with open(cargo_config_path, 'r') as f:
                config_content = f.read()
        
        # Check if we need to override any cross-compilation settings
        needs_override = False
        problematic_sections = [
            "[target.x86_64-unknown-linux-gnu]",
            'linker = "rust-lld"',
            'linker = "lld"'
        ]
        
        for section in problematic_sections:
            if section in config_content:
                needs_override = True
                break
        
        if needs_override:
            logger.info("Found cross-compilation config that conflicts with native build")
            logger.info("Creating temporary config override...")
            
            # Create a clean config that forces native linking
            native_config = """# Native build configuration for WSL/Linux
# This overrides any cross-compilation settings

[target.x86_64-unknown-linux-gnu]
# Use system linker for native builds
linker = "cc"

[build]
# Use native target
target = "x86_64-unknown-linux-gnu"
"""
            
            # Backup existing config
            if cargo_config_path.exists():
                backup_path = cargo_config_path.with_suffix('.toml.backup')
                cargo_config_path.rename(backup_path)
                logger.info(f"Backed up existing config to {backup_path}")
            
            # Write native config
            with open(cargo_config_path, 'w') as f:
                f.write(native_config)
            
            logger.info("Created native build configuration")
            return True
        
        return False
    
    def setup_cargo_config(self):
        """Setup cargo config for cross-compilation"""
        logger.info("Setting up cargo configuration for cross-compilation...")
        
        cargo_dir = self.backend_dir / ".cargo"
        cargo_config_path = cargo_dir / "config.toml"
        
        # Create .cargo directory if it doesn't exist
        cargo_dir.mkdir(exist_ok=True)
        
        # Check if config already exists and has our target
        config_content = ""
        if cargo_config_path.exists():
            with open(cargo_config_path, 'r') as f:
                config_content = f.read()
        
        # Check if our target configuration already exists
        target_section = f"[target.{self.rust_target}]"
        if target_section not in config_content:
            # Add our cross-compilation configuration
            additional_config = f"""
# Cross-compilation configuration for StreetSource
{target_section}
linker = "rust-lld"

"""
            
            # Append to existing config or create new
            with open(cargo_config_path, 'a') as f:
                f.write(additional_config)
            
            logger.info(f"Added cross-compilation config to {cargo_config_path}")
        else:
            logger.info("Cross-compilation config already exists")
    
    def build_frontend(self):
        """Build the React frontend"""
        logger.info("Building frontend...")
        
        # Install dependencies
        self.run_command(["npm", "install"], cwd=self.frontend_dir)
        
        # Build the project
        self.run_command(["npm", "run", "build"], cwd=self.frontend_dir)
        
        # Verify build output
        dist_dir = self.frontend_dir / "dist"
        if not dist_dir.exists():
            raise DeploymentError("Frontend build failed - dist directory not found")
        
        logger.info("Frontend build completed")
    
    def build_backend(self):
        """Build the Rust backend - native in WSL/Linux, cross-compile on Windows"""
        config_was_overridden = False
        
        if self.is_wsl or not self.is_windows:
            # Running in WSL or Linux - use native cargo build
            logger.info("Building backend natively in WSL/Linux environment")
            
            # Set up native build configuration
            config_was_overridden = self.setup_native_build_config()
            
            build_cmd = ["cargo", "build", "--release"]
            target_path = f"{self.rust_target}/release"
        else:
            # Running on Windows - use cross tool
            logger.info(f"Building backend using cross for target: {self.rust_target}")
            build_cmd = ["cross", "build", "--target", self.rust_target, "--release"]
            target_path = f"{self.rust_target}/release"
        
        try:
            subprocess.run(
                build_cmd,
                cwd=self.backend_dir,
                check=True,
                shell=self.is_windows and not self.is_wsl
            )
        except subprocess.CalledProcessError as e:
            if self.is_wsl or not self.is_windows:
                logger.error("Native build failed.")
                logger.error("Common issues:")
                logger.error("1. Missing system dependencies (build-essential, pkg-config, etc.)")
                logger.error("2. Missing development libraries for your dependencies")
                logger.error("3. Conflicting cargo config with cross-compilation settings")
                logger.error("4. Try: sudo apt update && sudo apt install build-essential pkg-config libssl-dev")
            else:
                logger.error("Cross compilation failed.")
                logger.error("Common issues and solutions:")
                logger.error("1. Make sure Docker is running and accessible")
                logger.error("2. Check if your project has a Cross.toml with custom Docker image")
                logger.error("3. Ensure all dependencies are compatible with cross-compilation")
                logger.error("4. Try running: cross --version  to verify cross is working")
            raise DeploymentError(f"Backend build failed: {e}")
        finally:
            # Restore original config if we overrode it
            if config_was_overridden:
                self.restore_cargo_config()
        
        # Verify binary exists
        target_dir = self.backend_dir / "target" / target_path
        if not target_dir.exists():
            raise DeploymentError("Backend build failed - release directory not found")
        
        # Find the binary (look for executable files)
        binaries = []
        for item in target_dir.iterdir():
            if item.is_file() and not item.suffix and item.name not in ["deps", "build", ".fingerprint", "incremental"]:
                # Skip directories and files that are clearly not executables
                if not item.name.startswith('.'):
                    binaries.append(item)
        
        if not binaries:
            # Let's also check what's actually in the directory for debugging
            logger.error(f"No binaries found in {target_dir}")
            logger.error("Directory contents:")
            for item in target_dir.iterdir():
                logger.error(f"  {item.name} ({'file' if item.is_file() else 'dir'})")
            raise DeploymentError("Backend build failed - no executable found")
        
        # If multiple binaries, try to find the main one
        if len(binaries) > 1:
            # Try to match project name from Cargo.toml
            cargo_toml = self.backend_dir / "Cargo.toml"
            project_name = None
            if cargo_toml.exists():
                try:
                    with open(cargo_toml, 'r') as f:
                        for line in f:
                            if line.strip().startswith('name = '):
                                project_name = line.split('=', 1)[1].strip().strip('"\'')
                                break
                except:
                    pass
            
            # Try to find binary matching project name or directory name
            candidates = [project_name, self.backend_dir.name] if project_name else [self.backend_dir.name]
            for candidate in candidates:
                if candidate:
                    candidate = candidate.replace('-', '_')  # Rust converts hyphens to underscores
                    for binary in binaries:
                        if binary.name == candidate:
                            self.backend_binary = binary
                            break
                    if hasattr(self, 'backend_binary'):
                        break
            
            if not hasattr(self, 'backend_binary'):
                logger.warning(f"Multiple binaries found, using first one: {binaries[0].name}")
                self.backend_binary = binaries[0]
        else:
            self.backend_binary = binaries[0]
        
        build_method = "natively" if (self.is_wsl or not self.is_windows) else "with cross"
        logger.info(f"Backend build completed {build_method}: {self.backend_binary}")
    
    def restore_cargo_config(self):
        """Restore original cargo config after build"""
        cargo_config_path = self.backend_dir / ".cargo" / "config.toml"
        backup_path = cargo_config_path.with_suffix('.toml.backup')
        
        if backup_path.exists():
            cargo_config_path.unlink(missing_ok=True)
            backup_path.rename(cargo_config_path)
            logger.info("Restored original cargo configuration")
    
    def setup_remote_environment(self):
        """Setup the remote Ubuntu server environment"""
        logger.info("Setting up remote environment...")
        
        # Update package list
        self.ssh_command("sudo apt update")
        
        # Create application directories
        self.ssh_command(f"sudo mkdir -p {self.remote_app_dir}")
        self.ssh_command(f"sudo mkdir -p {self.remote_frontend_dir}")
        self.ssh_command(f"sudo mkdir -p {self.remote_backend_dir}")
        
        # Set ownership to current user
        self.ssh_command(f"sudo chown -R $(whoami):$(whoami) {self.remote_app_dir}")
        
        # Install nginx if not present
        try:
            self.ssh_command("which nginx", capture_output=True)
        except DeploymentError:
            logger.info("Installing nginx...")
            self.ssh_command("sudo apt install -y nginx")
        
        # Enable and start nginx
        self.ssh_command("sudo systemctl enable nginx")
        self.ssh_command("sudo systemctl start nginx")
        
        logger.info("Remote environment setup completed")
    
    def deploy_frontend(self):
        """Deploy the frontend to the remote server"""
        logger.info("Deploying frontend...")
        
        # Copy built frontend files
        dist_path = str(self.frontend_dir / "dist")
        if self.is_windows:
            # On Windows, we need to handle the path differently
            dist_path = dist_path.replace("\\", "/")
            # Use PowerShell-style globbing or copy directory contents
            self.scp_copy(f"{dist_path}", self.remote_frontend_dir, recursive=True)
            # Remove the extra nested directory
            self.ssh_command(f"if [ -d {self.remote_frontend_dir}/dist ]; then mv {self.remote_frontend_dir}/dist/* {self.remote_frontend_dir}/ && rmdir {self.remote_frontend_dir}/dist; fi")
        else:
            for item in Path(dist_path).iterdir():
                self.scp_copy(str(item), self.remote_frontend_dir, recursive=item.is_dir())

        
        logger.info("Frontend deployment completed")
    
    def deploy_backend(self):
        """Deploy the backend to the remote server"""
        logger.info("Deploying backend...")
        
        # Copy the binary
        binary_name = self.backend_binary.name
        self.scp_copy(str(self.backend_binary), f"{self.remote_backend_dir}/{binary_name}")
        
        # Make sure it's executable
        self.ssh_command(f"chmod +x {self.remote_backend_dir}/{binary_name}")
        
        # Copy any additional files (config, etc.)
        config_files = ["Cargo.toml", ".env.example", "config.*"]
        for pattern in config_files:
            matching_files = list(self.backend_dir.glob(pattern))
            for file in matching_files:
                if file.is_file():
                    self.scp_copy(str(file), f"{self.remote_backend_dir}/")
        
        self.backend_binary_name = binary_name
        logger.info("Backend deployment completed")
    
    def setup_systemd_service(self):
        """Create and enable systemd service for the backend"""
        logger.info("Setting up systemd service...")
        
        service_content = f"""[Unit]
Description=StreetSource Backend Service
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=1
User=ubuntu
WorkingDirectory={self.remote_backend_dir}
ExecStart={self.remote_backend_dir}/{self.backend_binary_name}
Environment=PORT={self.backend_port}
Environment=RUST_LOG=info

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths={self.remote_backend_dir}

[Install]
WantedBy=multi-user.target
"""
        
        # Write service file to remote server
        service_file = "/tmp/streetsource-backend.service"
        self.ssh_command(f"cat > {service_file} << 'EOF'\n{service_content}EOF")
        
        # Move to systemd directory and reload
        self.ssh_command(f"sudo mv {service_file} /etc/systemd/system/")
        self.ssh_command("sudo systemctl daemon-reload")
        self.ssh_command("sudo systemctl enable streetsource-backend.service")
        
        logger.info("Systemd service setup completed")
    
    def configure_nginx(self):
        """Configure nginx to serve frontend and proxy backend"""
        logger.info("Configuring nginx...")
        
        nginx_config = fr"""server {{
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Serve static frontend files
    root {self.remote_frontend_dir};
    index index.html;

    # Backend API routes
    location ~ ^/(api|health|ws)/ {{
        proxy_pass http://127.0.0.1:{self.backend_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }}

    # Serve frontend for all other routes (SPA routing)
    location / {{
        try_files $uri $uri/ /index.html;
        
        # Cache control for HTML files
        location ~* \.html$ {{
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }}
    }}

    # Handle static assets with long-term caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {{
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # Enable gzip compression
        gzip_static on;
    }}

    # Security: Prevent access to sensitive files
    location ~ /\. {{
        deny all;
    }}
}}
"""
        
        # Write nginx config
        config_file = "/tmp/streetsource.conf"
        self.ssh_command(f"cat > {config_file} << 'EOF'\n{nginx_config}EOF")
        
        # Remove default nginx site and add our config
        self.ssh_command("sudo rm -f /etc/nginx/sites-enabled/default")
        self.ssh_command(f"sudo mv {config_file} /etc/nginx/sites-available/streetsource.conf")
        self.ssh_command("sudo ln -sf /etc/nginx/sites-available/streetsource.conf /etc/nginx/sites-enabled/")
        
        # Test configuration and restart nginx
        self.ssh_command("sudo nginx -t")
        self.ssh_command("sudo systemctl restart nginx")
        
        logger.info("Nginx configuration completed")
    
    def start_services(self):
        """Start the backend service"""
        logger.info("Starting services...")
        
        # Stop service if running
        try:
            self.ssh_command("sudo systemctl stop streetsource-backend.service")
        except DeploymentError:
            pass  # Service might not be running
        
        # Start the service
        self.ssh_command("sudo systemctl start streetsource-backend.service")
        
        # Check status
        try:
            status = self.ssh_command("sudo systemctl is-active streetsource-backend.service", capture_output=True)
            logger.info(f"StreetSource backend service status: {status}")
        except DeploymentError:
            logger.warning("Could not get service status")
        
        # Show service logs for debugging
        try:
            logs = self.ssh_command("sudo journalctl -u streetsource-backend.service --no-pager -n 10", capture_output=True)
            logger.info("Recent service logs:")
            for line in logs.split('\n')[-5:]:  # Show last 5 lines
                if line.strip():
                    logger.info(f"  {line}")
        except DeploymentError:
            pass
        
        logger.info("Services started")
    
    def deploy(self):
        """Run the complete deployment process"""
        try:
            logger.info("Starting StreetSource deployment process...")
            
            self.validate_environment()
            self.build_frontend()
            self.build_backend()
            self.setup_remote_environment()
            self.deploy_frontend()
            self.deploy_backend()
            self.setup_systemd_service()
            self.configure_nginx()
            self.start_services()
            
            logger.info("🎉 StreetSource deployment completed successfully!")
            logger.info(f"Your application should now be accessible at http://{self.host.split('@')[-1]}")
            logger.info("Service management commands:")
            logger.info(f"  sudo systemctl status streetsource-backend.service")
            logger.info(f"  sudo journalctl -u streetsource-backend.service -f")
            
        except DeploymentError as e:
            logger.error(f"❌ StreetSource deployment failed: {e}")
            sys.exit(1)
        except KeyboardInterrupt:
            logger.error("❌ Deployment cancelled by user")
            sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Deploy StreetSource React+Rust application to EC2")
    parser.add_argument(
        "--identity-file", "-i",
        required=True,
        help="Path to the SSH private key file (e.g., /path/to/key.pem)"
    )
    parser.add_argument(
        "--host", "-H",
        required=True,
        help="SSH host in format user@hostname (e.g., ubuntu@1.2.3.4)"
    )
    parser.add_argument(
        "--backend-port", "-p",
        type=int,
        default=3000,
        help="Port for the backend service (default: 3000)"
    )
    
    args = parser.parse_args()
    
    deployer = Deployer(args.identity_file, args.host, args.backend_port)
    deployer.deploy()

if __name__ == "__main__":
    main()