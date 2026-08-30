import { describe, it, expect, vi } from 'vitest';

const createMockSocket = (readyState: number) => ({
  readyState,
  send: vi.fn(),
  OPEN: 1,
  CONNECTING: 0,
  CLOSING: 2,
  CLOSED: 3,
});

const sendMessage = (
  socket: any,
  user: { id: string; token?: string } | null,
  type: string,
  data: Record<string, any>
): boolean => {
  if (!socket) return false;
  if (socket.readyState !== 1) return false;
  if (!user?.id || !user?.token) return false;

  const message = {
    type,
    data: { ...data, userId: user.id, token: user.token },
  };

  try {
    socket.send(JSON.stringify(message));
    return true;
  } catch {
    return false;
  }
};

describe('sendMessage', () => {
  it('sends message when socket is open and user is authenticated', () => {
    const socket = createMockSocket(1);
    const user = { id: 'user-123', token: 'jwt-token' };

    const result = sendMessage(socket, user, 'join-space', { spaceId: 'abc' });

    expect(result).toBe(true);
    expect(socket.send).toHaveBeenCalledOnce();
    const sent = JSON.parse(socket.send.mock.calls[0][0]);
    expect(sent.type).toBe('join-space');
    expect(sent.data.userId).toBe('user-123');
    expect(sent.data.token).toBe('jwt-token');
    expect(sent.data.spaceId).toBe('abc');
  });

  it('returns false when socket is null', () => {
    expect(sendMessage(null, { id: '1', token: 't' }, 'test', {})).toBe(false);
  });

  it('returns false when socket is not open', () => {
    const socket = createMockSocket(0);
    expect(sendMessage(socket, { id: '1', token: 't' }, 'test', {})).toBe(false);
    expect(socket.send).not.toHaveBeenCalled();
  });

  it('returns false when socket is closing', () => {
    const socket = createMockSocket(2);
    expect(sendMessage(socket, { id: '1', token: 't' }, 'test', {})).toBe(false);
  });

  it('returns false when socket is closed', () => {
    const socket = createMockSocket(3);
    expect(sendMessage(socket, { id: '1', token: 't' }, 'test', {})).toBe(false);
  });

  it('returns false when user is null', () => {
    const socket = createMockSocket(1);
    expect(sendMessage(socket, null, 'test', {})).toBe(false);
  });

  it('returns false when user has no token', () => {
    const socket = createMockSocket(1);
    expect(sendMessage(socket, { id: '1' }, 'test', {})).toBe(false);
  });

  it('returns false when user has empty token', () => {
    const socket = createMockSocket(1);
    expect(sendMessage(socket, { id: '1', token: '' }, 'test', {})).toBe(false);
  });

  it('returns false when user has no id', () => {
    const socket = createMockSocket(1);
    expect(sendMessage(socket, { id: '', token: 'tok' }, 'test', {})).toBe(false);
  });

  it('overwrites userId and token from data with user values', () => {
    const socket = createMockSocket(1);
    const user = { id: 'real-id', token: 'real-token' };

    sendMessage(socket, user, 'test', { userId: 'fake', token: 'fake' });

    const sent = JSON.parse(socket.send.mock.calls[0][0]);
    expect(sent.data.userId).toBe('real-id');
    expect(sent.data.token).toBe('real-token');
  });

  it('returns false when send throws', () => {
    const socket = createMockSocket(1);
    socket.send.mockImplementation(() => { throw new Error('network error'); });

    const result = sendMessage(socket, { id: '1', token: 't' }, 'test', {});
    expect(result).toBe(false);
  });
});
