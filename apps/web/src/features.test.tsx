import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Today } from './features';
import { AppProvider } from './app/AppContext';
describe('Today', () => {
  it('shows calculated snapshot', async () => {
    render(
      <MemoryRouter>
        <AppProvider>
          <Today />
        </AppProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Vyhod/i)).toBeInTheDocument();
    expect(await screen.findByText(/Можно потратить|Available to spend/i)).toBeInTheDocument();
  });
});
