import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { renderWithTheme } from 'test/renderWithTheme';
import GuardianDashboard from './GuardianDashboard';

const renderPage = () =>
  renderWithTheme(
    <MemoryRouter>
      <GuardianDashboard />
    </MemoryRouter>,
  );

describe('GuardianDashboard layout', () => {
  it('shows the welcome message before quick access links', () => {
    renderPage();

    const welcomeHeading = screen.getByRole('heading', {
      name: /bem-vindo à área da família/i,
    });
    const quickAccessHeading = screen.getByRole('heading', {
      name: /acesso rápido/i,
    });

    expect(welcomeHeading.compareDocumentPosition(quickAccessHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('shows guardian quick links', () => {
    renderPage();

    expect(screen.getByRole('link', { name: 'Preceptoria' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Meus boletos' })).toBeInTheDocument();
  });
});
