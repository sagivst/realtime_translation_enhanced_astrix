FROM andrius/asterisk:16-current

# Copy configuration files
COPY config/http.conf /etc/asterisk/http.conf
COPY config/sip.conf /etc/asterisk/sip.conf
COPY config/extensions.conf /etc/asterisk/extensions.conf
COPY config/ari.conf /etc/asterisk/ari.conf

# Copy SSL certificates
COPY keys/asterisk.pem /etc/asterisk/keys/asterisk.pem

# Set permissions
RUN chmod 644 /etc/asterisk/keys/asterisk.pem

# Expose ports
# 5060 UDP - SIP
# 8088 - WebSocket
# 8089 - WebSocket Secure (WSS)
# 10000-20000 UDP - RTP
EXPOSE 5060/udp 8088 8089 10000-20000/udp

# Start Asterisk
CMD ["asterisk", "-f", "-vvv"]
