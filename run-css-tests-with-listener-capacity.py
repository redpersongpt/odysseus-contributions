"""Run unmodified CSS tests with a larger auxiliary HTTP accept queue.

This changes only socketserver's test-process listener configuration. It does
not alter CSS, page content, browser routes, snapshots or assertions.
"""
import json
import socket
import socketserver
import sys

import pytest

print(json.dumps({'test_listener_backlog_before': socketserver.TCPServer.request_queue_size,
                  'test_listener_backlog_after': socket.SOMAXCONN}), flush=True)
socketserver.TCPServer.request_queue_size = socket.SOMAXCONN
raise SystemExit(pytest.main(sys.argv[1:]))
