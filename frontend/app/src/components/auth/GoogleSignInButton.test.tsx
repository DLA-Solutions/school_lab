import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import GoogleSignInButton from './GoogleSignInButton';

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GOOGLE_OAUTH_CLIENT_ID', 'test-client-id.apps.googleusercontent.com');
  });

  afterEach(() => {
    document.head.querySelectorAll('script[src*="accounts.google.com/gsi/client"]').forEach((node) => {
      node.remove();
    });
    delete window.google;
  });

  it('renders nothing when the client ID is not configured', () => {
    vi.stubEnv('VITE_GOOGLE_OAUTH_CLIENT_ID', '');
    const { container } = render(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('initializes GIS and renders the official button', async () => {
    const onCredential = vi.fn();
    const renderButton = vi.fn();
    const initialize = vi.fn();

    window.google = {
      accounts: {
        id: {
          initialize,
          renderButton,
        },
      },
    };

    const { container } = render(<GoogleSignInButton onCredential={onCredential} />);

    await waitFor(() => expect(initialize).toHaveBeenCalled());
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'test-client-id.apps.googleusercontent.com' }),
    );
    expect(renderButton).toHaveBeenCalled();
    expect(container.firstChild).not.toBeNull();
  });
});
