#
# Makefile for chan_externalmedia
# External Media Channel Driver for Asterisk
#

# Asterisk source directory (adjust as needed)
AST_SRC_DIR ?= ../../asterisk-build/asterisk-20.16.0

# Module name
MODULE = chan_externalmedia.so
OBJECTS = chan_externalmedia.o

# Compiler flags
CC = gcc
CFLAGS = -pipe -fPIC -Wall -Wstrict-prototypes -Wmissing-prototypes \
         -Wmissing-declarations -D_REENTRANT -D_GNU_SOURCE \
         -I$(AST_SRC_DIR)/include
LDFLAGS = -shared -Wl,-undefined,dynamic_lookup

# Build targets
all: $(MODULE)

$(MODULE): $(OBJECTS)
	@echo "Linking $(MODULE)..."
	$(CC) $(LDFLAGS) -o $@ $^
	@echo "✓ Built $(MODULE)"

%.o: %.c
	@echo "Compiling $<..."
	$(CC) $(CFLAGS) -c -o $@ $<

clean:
	@echo "Cleaning..."
	rm -f $(MODULE) $(OBJECTS)
	@echo "✓ Clean complete"

install: $(MODULE)
	@echo "Installing $(MODULE) to Asterisk modules directory..."
	@if [ -d "/usr/local/lib/asterisk/modules" ]; then \
		cp $(MODULE) /usr/local/lib/asterisk/modules/; \
		echo "✓ Installed to /usr/local/lib/asterisk/modules/"; \
	elif [ -d "/opt/asterisk/lib/asterisk/modules" ]; then \
		cp $(MODULE) /opt/asterisk/lib/asterisk/modules/; \
		echo "✓ Installed to /opt/asterisk/lib/asterisk/modules/"; \
	else \
		echo "✗ Asterisk modules directory not found"; \
		echo "  Please install manually to your Asterisk modules directory"; \
	fi

uninstall:
	@echo "Uninstalling $(MODULE)..."
	@rm -f /usr/local/lib/asterisk/modules/$(MODULE)
	@rm -f /opt/asterisk/lib/asterisk/modules/$(MODULE)
	@echo "✓ Uninstalled"

test:
	@echo "Testing compilation..."
	@$(MAKE) clean
	@$(MAKE) all
	@echo "✓ Build test passed"

.PHONY: all clean install uninstall test
