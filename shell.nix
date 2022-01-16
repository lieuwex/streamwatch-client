with (import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/e91ed60026951707237c22b5502f283c8da9667c.tar.gz") {});

pkgs.mkShell {
	buildInputs = [
		nodejs-17_x
	];
}
