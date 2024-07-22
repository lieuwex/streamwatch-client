with (import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/release-24.05.tar.gz") {});

pkgs.mkShell {
	buildInputs = [
		nodejs_22
	];
}
