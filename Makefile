BROWSERIFY=./node_modules/browserify/bin/cmd.js
OUTPUT_DIR=./src/static
OUTPUT_FNAME=FlickTrack.js
OUTPUT_DEST=$(OUTPUT_DIR)/$(OUTPUT_FNAME)
INPUT_FILES=./src/client/main.js

all:
	@$(BROWSERIFY) $(INPUT_FILES) --outfile $(OUTPUT_DEST)
