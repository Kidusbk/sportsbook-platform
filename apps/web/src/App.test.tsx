import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlaceholderPage } from './components/PlaceholderPage';

describe('PlaceholderPage', () => {
  it('renders the title and description', () => {
    render(<MemoryRouter><PlaceholderPage icon="⚽" title="Test Page" description="This is a test" /></MemoryRouter>);
    expect(screen.getByText('Test Page')).toBeInTheDocument();
    expect(screen.getByText('This is a test')).toBeInTheDocument();
  });
  it('renders badge when provided', () => {
    render(<MemoryRouter><PlaceholderPage icon="🔴" title="Live" description="Desc" badge="Coming Soon" /></MemoryRouter>);
    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
  });
  it('does not render badge when not provided', () => {
    render(<MemoryRouter><PlaceholderPage icon="📊" title="Results" description="Desc" /></MemoryRouter>);
    expect(screen.queryByText('Coming Soon')).not.toBeInTheDocument();
  });
});
